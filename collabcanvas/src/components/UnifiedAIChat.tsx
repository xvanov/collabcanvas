/**
 * Unified AI Chat Component
 * Combines Canvas AI Assistant and Material Estimation into one interface
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useCanvasStore } from "../store/canvasStore";
import { useScopeStore } from "../store/scopeStore";
import { useAuth } from "../hooks/useAuth";
import { processDialogueRequest } from "../services/aiDialogueService";
import { MaterialAIService } from "../services/materialAIService";
import {
  validatePreflight,
  generatePreflightPrompt,
  generateClarifyingQuestions,
  type PreflightCheck,
} from "../services/preflightService";
import { AIService } from "../services/aiService";
import { saveBOM } from "../services/bomService";
import { saveCPM } from "../services/cpmService";
import { formatErrorForDisplay } from "../utils/errorHandler";
import { invokeAnnotationEndpoint } from "../services/sagemakerService";
import { useScopedCanvasStore } from "../store/projectCanvasStore";
import { useShapes } from "../hooks/useShapes";
import { useLayers } from "../hooks/useLayers";
import { createBoundingBoxShape } from "../services/shapeService";

interface UnifiedAIChatProps {
  isVisible: boolean;
  onClose: () => void;
}

type ChatMessage = {
  id: string;
  type: "user" | "assistant" | "system" | "success" | "error";
  content: string;
  timestamp: number;
  metadata?: {
    createdShapes?: number;
    modifiedShapes?: number;
    deletedShapes?: number;
    calculation?: {
      materials: Array<{ name: string; quantity: number; unit: string }>;
    };
  };
};

export const UnifiedAIChat: React.FC<UnifiedAIChatProps> = ({
  isVisible,
  onClose,
}) => {
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Use refs to ensure single instance per component mount
  const materialAIRef = useRef<MaterialAIService | null>(null);
  const aiServiceRef = useRef<AIService | null>(null);

  if (!materialAIRef.current) {
    materialAIRef.current = new MaterialAIService();
  }
  if (!aiServiceRef.current) {
    aiServiceRef.current = new AIService();
  }

  const materialAI = materialAIRef.current;
  const aiService = aiServiceRef.current;

  // Track current view context
  const getCurrentView = useCallback(():
    | "scope"
    | "time"
    | "space"
    | "money"
    | null => {
    const pathname = location.pathname;
    if (pathname.includes("/scope")) return "scope";
    if (pathname.includes("/time")) return "time";
    if (pathname.includes("/space")) return "space";
    if (pathname.includes("/money")) return "money";
    return null;
  }, [location.pathname]);

  const currentView = getCurrentView();

  // Canvas AI state
  const processAICommand = useCanvasStore((state) => state.processAICommand);
  const aiCommandHistory = useCanvasStore((state) => state.aiCommandHistory);

  // Normalize projectId to ensure consistent hook calls
  const normalizedProjectId: string | undefined = projectId || undefined;

  // Use project-scoped store for project-specific data - ALWAYS call with normalizedProjectId
  const projectLayers = useScopedCanvasStore(
    normalizedProjectId,
    (state) => state.layers
  );
  const projectShapes = useScopedCanvasStore(
    normalizedProjectId,
    (state) => state.shapes
  );
  const projectScaleLine = useScopedCanvasStore(
    normalizedProjectId,
    (state) => state.canvasScale?.scaleLine
  );
  const projectBackgroundImage = useScopedCanvasStore(
    normalizedProjectId,
    (state) => state.canvasScale?.backgroundImage
  );
  // Unused but kept for potential future use
  // const projectActiveLayerId = useScopedCanvasStore(normalizedProjectId, (state) => state.activeLayerId);
  // const createLayer = useScopedCanvasStore(normalizedProjectId, (state) => state.createLayer);

  // Fallback to global store for backward compatibility - ALWAYS call hooks, then use conditional logic
  const globalLayers = useCanvasStore((state) => state.layers);
  const globalShapes = useCanvasStore((state) => state.shapes);
  const globalScaleLine = useCanvasStore(
    (state) => state.canvasScale?.scaleLine
  );
  const globalBackgroundImage = useCanvasStore(
    (state) => state.canvasScale?.backgroundImage
  );

  // Use project-scoped data if available, otherwise fall back to global
  const layers = projectLayers.length > 0 ? projectLayers : globalLayers;
  const shapes = projectShapes.size > 0 ? projectShapes : globalShapes;
  const scaleLine = projectScaleLine || globalScaleLine;
  const backgroundImage = projectBackgroundImage || globalBackgroundImage;

  // Get shape and layer hooks for project-scoped operations
  // Always call hooks unconditionally - projectId can be undefined but hooks must be called
  const { createShape } = useShapes(normalizedProjectId);
  const {
    layers: hookLayers,
    createLayer: hookCreateLayer,
    updateLayer: hookUpdateLayer,
  } = useLayers(normalizedProjectId);

  // Scope state for pre-flight validation
  const scope = useScopeStore((state) => state.scope);

  // Material Estimation state
  const dialogue = useCanvasStore((state) => state.materialDialogue);
  const startDialogue = useCanvasStore((state) => state.startMaterialDialogue);
  const updateDialogue = useCanvasStore(
    (state) => state.updateMaterialDialogue
  );
  const addCalculation = useCanvasStore(
    (state) => state.addMaterialCalculation
  );
  const setBillOfMaterials = useCanvasStore(
    (state) => state.setBillOfMaterials
  );

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiCommandHistory, dialogue]);

  // Load scope for pre-flight validation
  useEffect(() => {
    if (!projectId) return;

    const { loadScope, subscribe } = useScopeStore.getState();
    loadScope(projectId).catch(console.error);
    subscribe(projectId);

    return () => {
      const { unsubscribe } = useScopeStore.getState();
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId]);

  // Calculate scale factor
  const scaleFactor = scaleLine
    ? scaleLine.realWorldLength /
      Math.sqrt(
        Math.pow(scaleLine.endX - scaleLine.startX, 2) +
          Math.pow(scaleLine.endY - scaleLine.startY, 2)
      )
    : 1;

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const messageText = input.trim();
    setInput("");
    setIsProcessing(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: "user",
      content: messageText,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      // PRIORITY 1: Check if this is a BOM/CPM generation request
      const isBOMCPMRequest = detectBOMCPMGeneration(messageText);
      if (isBOMCPMRequest) {
        await handleBOMCPMGeneration();
        return;
      }

      // PRIORITY 2: Check if this is an annotation command
      const isAnnotationCommand = detectAnnotationCommand(messageText);
      if (isAnnotationCommand) {
        await handleAnnotationCommand();
        return;
      }

      // PRIORITY 3: Check if this is a vision query
      const isVisionQuery = needsVisionAnalysis(messageText);

      if (isVisionQuery && backgroundImage?.url) {
        // Handle vision analysis directly
        await handleVisionQuery(messageText);
        return;
      }

      // PRIORITY 4: Material estimation or canvas command
      const hasActiveDialogue = dialogue && dialogue.stage !== "complete";
      const hasCompletedDialogue = dialogue && dialogue.stage === "complete";
      const isMaterialQuery = detectMaterialQuery(messageText);
      const isRefinement = hasCompletedDialogue && isMaterialQuery;

      const shouldUseMaterialEstimation =
        hasActiveDialogue || isRefinement || isMaterialQuery;

      if (shouldUseMaterialEstimation) {
        await handleMaterialEstimation(messageText);
      } else {
        await handleCanvasCommand(messageText);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: "error",
        content: `Error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Detect if query is requesting BOM/CPM generation
   */
  const detectBOMCPMGeneration = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const bomKeywords = [
      "generate bom",
      "create bom",
      "generate bill of materials",
      "generate critical path",
      "generate bom and critical path",
      "generate bom and cpm",
      "create bill of materials",
      "generate materials list",
      "generate estimate",
    ];

    return bomKeywords.some((kw) => lowerQuery.includes(kw));
  };

  /**
   * Handle BOM/CPM generation request with pre-flight validation
   */
  const handleBOMCPMGeneration = async () => {
    if (!projectId || !user) {
      const errorMsg: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        type: "error",
        content: "Error: Project ID or user not available",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Run pre-flight validation
    const validationResult = validatePreflight({
      scaleLine: scaleLine || undefined,
      layers,
      shapes,
      scope,
    });

    // Display pre-flight checklist
    const checklistMessage: ChatMessage = {
      id: `msg-checklist-${Date.now()}`,
      type: "system",
      content: generatePreflightChecklistUI(validationResult.checks),
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, checklistMessage]);

    // If validation fails, block generation and show guidance
    if (!validationResult.canGenerate) {
      const blockingMessage: ChatMessage = {
        id: `msg-blocking-${Date.now()}`,
        type: "error",
        content: generatePreflightPrompt(validationResult),
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, blockingMessage]);

      // Add clarifying questions
      const questions = generateClarifyingQuestions(validationResult);
      if (questions.length > 0) {
        const questionsMessage: ChatMessage = {
          id: `msg-questions-${Date.now()}`,
          type: "assistant",
          content:
            "**Clarifying Questions:**\n\n" +
            questions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, questionsMessage]);
      }

      return; // Block generation
    }

    // Validation passed - proceed with parallel generation
    // Progress tracking is handled via updateProgressMessage callback

    // Prepare annotations data
    const annotations = Array.from(shapes.values());

    try {
      const result = await aiService.generateBOMAndCPM(
        {
          projectId,
          userId: user.uid,
          annotations,
          scope: scope || undefined,
          scaleFactor,
          autoFetchPrices: true, // Automatically fetch prices after BOM generation (AC: #5)
          onPriceProgress: (stats) => {
            // Update progress message with price fetching stats
            const priceMessage: ChatMessage = {
              id: `msg-price-progress-${Date.now()}`,
              type: "system",
              content: `💰 Price fetching: ${stats.successful}/${
                stats.total
              } materials priced (${stats.successRate.toFixed(
                1
              )}% success rate)`,
              timestamp: Date.now(),
            };
            setChatMessages((prev) => {
              // Remove previous price progress messages
              const filtered = prev.filter(
                (msg) => !msg.id.includes("price-progress")
              );
              return [...filtered, priceMessage];
            });
          },
        },
        {
          projectId,
          userId: user.uid,
          scope: scope || undefined,
          annotations,
        },
        (progress) => {
          // Update progress message
          updateProgressMessage(progress);
        }
      );

      // Handle results
      if (result.bothSucceeded) {
        // Save both to Firestore
        if (result.bom.bom) {
          await saveBOM(projectId, result.bom.bom, user.uid);
          // Update store so Money view and MaterialEstimationPanel can see it
          setBillOfMaterials(result.bom.bom);
        }
        if (result.cpm.cpm) {
          await saveCPM(projectId, result.cpm.cpm, user.uid);
        }

        const successMessage: ChatMessage = {
          id: `msg-success-${Date.now()}`,
          type: "success",
          content:
            "✅ BOM and Critical Path generated successfully!\n\n- BOM is available in Money view\n- Critical Path is available in Time view",
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, successMessage]);
      } else if (result.partialSuccess) {
        // Handle partial success
        let message = "⚠️ Partial generation completed:\n\n";
        if (result.bom.success && result.bom.bom) {
          await saveBOM(projectId, result.bom.bom, user.uid);
          // Update store so Money view and MaterialEstimationPanel can see it
          setBillOfMaterials(result.bom.bom);
          message += "✅ BOM generated successfully\n";
        } else {
          message += `❌ BOM generation failed: ${
            result.bom.error || "Unknown error"
          }\n`;
        }
        if (result.cpm.success && result.cpm.cpm) {
          await saveCPM(projectId, result.cpm.cpm, user.uid);
          message += "✅ Critical Path generated successfully\n";
        } else {
          message += `❌ Critical Path generation failed: ${
            result.cpm.error || "Unknown error"
          }\n`;
        }
        message += "\nYou can retry the failed generation separately.";

        const partialMessage: ChatMessage = {
          id: `msg-partial-${Date.now()}`,
          type: "error",
          content: message,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, partialMessage]);
      } else {
        // Both failed
        // AC: #20 - AI BOM generation error handling with retry options
        const errorInfoBOM = formatErrorForDisplay(result.bom.error);
        const errorInfoCPM = formatErrorForDisplay(result.cpm.error);
        const errorMessage: ChatMessage = {
          id: `msg-error-${Date.now()}`,
          type: "error",
          content: `❌ Generation failed:\n\n**BOM Generation:**\n${
            errorInfoBOM.title
          }: ${errorInfoBOM.message}${
            errorInfoBOM.canRetry ? " (Retryable)" : ""
          }\n\n**Critical Path Generation:**\n${errorInfoCPM.title}: ${
            errorInfoCPM.message
          }${errorInfoCPM.canRetry ? " (Retryable)" : ""}\n\n${
            errorInfoBOM.canRetry || errorInfoCPM.canRetry
              ? "💡 **Tip:** You can try again - some errors are temporary and may resolve on retry."
              : "Please check your project setup and try again."
          }`,
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      // AC: #20 - AI BOM generation error handling
      const errorInfo = formatErrorForDisplay(error);
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        type: "error",
        content: `❌ Error during generation:\n\n**${errorInfo.title}**\n${
          errorInfo.message
        }${
          errorInfo.canRetry
            ? "\n\n💡 **Tip:** This error may be temporary. You can try again."
            : ""
        }`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Progress tracking completed
    }
  };

  /**
   * Update progress message in chat
   */
  const updateProgressMessage = (progress: {
    bom?: "generating" | "complete" | "error";
    cpm?: "generating" | "complete" | "error";
  }) => {
    // Remove existing progress messages
    setChatMessages((prev) =>
      prev.filter((msg) => !msg.id.includes("progress-"))
    );

    let progressText = "**Generation Progress:**\n\n";
    progressText += `BOM: ${
      progress.bom === "generating"
        ? "⏳ Generating..."
        : progress.bom === "complete"
        ? "✅ Complete"
        : progress.bom === "error"
        ? "❌ Error"
        : "⏸️ Pending"
    }\n`;
    progressText += `Critical Path: ${
      progress.cpm === "generating"
        ? "⏳ Generating..."
        : progress.cpm === "complete"
        ? "✅ Complete"
        : progress.cpm === "error"
        ? "❌ Error"
        : "⏸️ Pending"
    }`;

    const progressMessage: ChatMessage = {
      id: `msg-progress-${Date.now()}`,
      type: "system",
      content: progressText,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, progressMessage]);
  };

  /**
   * Generate pre-flight checklist UI
   */
  const generatePreflightChecklistUI = (checks: PreflightCheck[]): string => {
    let message = "**Pre-flight Checklist:**\n\n";

    checks.forEach((check) => {
      const icon =
        check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️";
      const category =
        check.category === "required" ? "[Required]" : "[Recommended]";
      message += `${icon} ${category} ${check.label}: ${check.message}\n`;
    });

    return message;
  };

  /**
   * Detect if query is requesting automatic annotation
   */
  const detectAnnotationCommand = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const annotationKeywords = [
      "annotate plan",
      "automatically annotate",
      "detect windows",
      "detect doors",
      "auto annotate",
      "automatic annotation",
      "detect fixtures",
      "find windows and doors",
      "identify windows",
      "identify doors",
    ];

    return annotationKeywords.some((kw) => lowerQuery.includes(kw));
  };

  /**
   * Convert image URL to base64 PNG
   * Uses Firebase Storage SDK to avoid CORS issues
   */
  const imageUrlToBase64 = async (imageUrl: string): Promise<string> => {
    try {
      // Import Firebase Storage functions dynamically to avoid circular dependencies
      const { ref, getBytes } = await import("firebase/storage");
      const { storage } = await import("../services/firebase");

      // Extract storage path from Firebase Storage URL
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+?)(\?|$)/);

      if (!pathMatch) {
        // Fallback: try direct fetch with CORS mode (may still fail but worth trying)
        console.warn(
          "Could not extract storage path from URL, attempting direct fetch"
        );
        const response = await fetch(imageUrl, { mode: "cors" });
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            const base64Data = base64String.split(",")[1] || base64String;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Decode the storage path (it's URL-encoded)
      const storagePath = decodeURIComponent(pathMatch[1]);
      const storageRef = ref(storage, storagePath);

      // Get image bytes using Firebase Storage SDK (no CORS issues)
      const bytes = await getBytes(storageRef);

      // Convert Uint8Array to base64
      // getBytes returns Uint8Array, handle it properly
      const uint8Array = new Uint8Array(bytes);

      // Handle large arrays by chunking to avoid "Maximum call stack size exceeded"
      const chunkSize = 8192;
      let binaryString = "";
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.slice(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(
          null,
          Array.from(chunk) as number[]
        );
      }
      const base64String = btoa(binaryString);

      return base64String;
    } catch (error) {
      console.error("Error converting image to base64:", error);
      throw new Error(
        "Failed to process image. Please ensure the image is accessible."
      );
    }
  };

  /**
   * Handle automatic annotation command
   */
  const handleAnnotationCommand = async () => {
    if (!projectId || !user) {
      const errorMsg: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        type: "error",
        content: "Error: Project ID or user not available",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Check if background image exists
    if (!backgroundImage?.url) {
      const errorMsg: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        type: "error",
        content:
          "❌ No plan image found. Please upload a plan image first before requesting automatic annotation.",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      return;
    }

    // Show loading message
    const loadingMessage: ChatMessage = {
      id: `msg-loading-${Date.now()}`,
      type: "system",
      content:
        "⏳ Processing plan image and invoking AI annotation endpoint... This may take 30-60 seconds.",
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, loadingMessage]);

    try {
      // Convert image to base64 PNG
      const imageBase64 = await imageUrlToBase64(backgroundImage.url);

      // Invoke SageMaker endpoint
      const detections = await invokeAnnotationEndpoint(imageBase64, projectId);

      // Remove loading message
      setChatMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));

      // Handle no detections
      if (detections.length === 0) {
        const noDetectionsMessage: ChatMessage = {
          id: `msg-no-detections-${Date.now()}`,
          type: "assistant",
          content:
            "ℹ️ No items were detected in the plan image. The AI model did not find any windows, doors, or fixtures.",
          timestamp: Date.now(),
        };
        setChatMessages((prev) => [...prev, noDetectionsMessage]);
        return;
      }

      // Group detections by item type (door, window, etc.)
      const detectionsByType = new Map<string, typeof detections>();
      for (const detection of detections) {
        const itemType = detection.name_hint.toLowerCase();
        if (!detectionsByType.has(itemType)) {
          detectionsByType.set(itemType, []);
        }
        detectionsByType.get(itemType)!.push(detection);
      }

      // Helper function to capitalize first letter and pluralize
      const formatLayerName = (itemType: string): string => {
        const capitalized =
          itemType.charAt(0).toUpperCase() + itemType.slice(1);
        // Simple pluralization - add 's' if not already plural
        return itemType.endsWith("s") ? capitalized : `${capitalized}s`;
      };

      // Helper function to get color for item type
      const getColorForItemType = (itemType: string): string => {
        const colors: Record<string, string> = {
          door: "#EF4444", // Red for doors
          window: "#3B82F6", // Blue for windows
          sink: "#10B981", // Green for sinks
          stove: "#F59E0B", // Amber for stoves
          toilet: "#8B5CF6", // Purple for toilets
        };
        return colors[itemType.toLowerCase()] || "#10B981"; // Default green
      };

      // Create layers for each item type and assign detections
      const layerMap = new Map<
        string,
        { id: string; name: string; color: string }
      >();
      let createdCount = 0;

      for (const [itemType, typeDetections] of detectionsByType) {
        // Find or create layer for this item type
        const layerName = formatLayerName(itemType);
        const itemLayer = hookLayers.find((l) => l.name === layerName);
        let layerId: string;
        let layerColor: string;

        if (!itemLayer) {
          try {
            // Create layer for this item type
            layerId = `layer-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`;
            layerColor = getColorForItemType(itemType);

            // Create layer with name and our specified ID
            await hookCreateLayer(layerName, layerId);

            // Wait a moment for the layer to be created in Firestore before updating
            // This ensures the layer exists before we try to update it or assign shapes to it
            await new Promise((resolve) => setTimeout(resolve, 300));

            // Update layer with color and other properties
            // We use the layerId directly since we created it with this ID
            try {
              await hookUpdateLayer(layerId, {
                color: layerColor,
                visible: true,
                locked: false,
                order: hookLayers.length + layerMap.size,
              });
            } catch (updateError) {
              console.warn(
                `⚠️ Failed to update layer ${layerId} properties, but layer exists:`,
                updateError
              );
              // Continue anyway - the layer exists, we just couldn't update its properties
            }

            // Store layer info using the layerId we created
            // This ensures we use the correct layerId when creating shapes
            layerMap.set(itemType, {
              id: layerId,
              name: layerName,
              color: layerColor,
            });

            console.log(`✅ Layer "${layerName}" created with ID: ${layerId}`);
          } catch (layerError) {
            console.error(`Failed to create ${layerName} layer:`, layerError);
            // Fallback: use default layer if creation fails
            const defaultLayer =
              hookLayers.find((l) => l.id === "default-layer") || hookLayers[0];
            if (!defaultLayer) {
              throw new Error(
                `Failed to create ${layerName} layer and no default layer available.`
              );
            }
            layerId = defaultLayer.id;
            layerColor = defaultLayer.color || getColorForItemType(itemType);
            layerMap.set(itemType, {
              id: layerId,
              name: defaultLayer.name,
              color: layerColor,
            });
          }
        } else {
          // Layer already exists, use it
          layerId = itemLayer.id;
          layerColor = itemLayer.color || getColorForItemType(itemType);
          layerMap.set(itemType, {
            id: layerId,
            name: itemLayer.name,
            color: layerColor,
          });
        }

        // Create bounding box shapes for this item type
        const layerInfo = layerMap.get(itemType)!;
        console.log(
          `🎯 Creating ${typeDetections.length} ${itemType} detection(s) on layer: ${layerInfo.name} (${layerInfo.id})`
        );

        for (const detection of typeDetections) {
          const [xMin, yMin, xMax, yMax] = detection.bbox;
          const width = xMax - xMin;
          const height = yMax - yMin;

          const shape = createBoundingBoxShape(
            xMin,
            yMin,
            width,
            height,
            detection.name_hint,
            layerInfo.color,
            user.uid,
            layerInfo.id, // Use the layerId we stored
            "ai",
            detection.confidence,
            true
          );

          console.log(
            `📦 Creating shape for ${detection.name_hint} on layer ${layerInfo.id}:`,
            {
              shapeId: shape.id,
              layerId: shape.layerId,
              expectedLayerId: layerInfo.id,
              match: shape.layerId === layerInfo.id,
            }
          );

          // Verify the shape has the correct layerId before creating
          if (shape.layerId !== layerInfo.id) {
            console.error(
              `❌ Shape layerId mismatch! Expected ${layerInfo.id}, got ${shape.layerId}`
            );
            // Fix it
            shape.layerId = layerInfo.id;
          }

          await createShape(shape);
          createdCount++;
        }
      }

      // Show success message with layer information
      const layerNames = Array.from(layerMap.values()).map((l) => l.name);
      const layerSummary =
        layerNames.length > 0
          ? `\n\nCreated layers: ${layerNames.join(", ")}`
          : "";
      const successMessage: ChatMessage = {
        id: `msg-success-${Date.now()}`,
        type: "success",
        content: `✅ Successfully created ${createdCount} AI annotation${
          createdCount !== 1 ? "s" : ""
        }${layerSummary}.\n\nDetected items: ${detections
          .map((d) => `${d.name_hint} (${(d.confidence * 100).toFixed(0)}%)`)
          .join(", ")}`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      // Remove loading message
      setChatMessages((prev) => prev.filter((m) => m.id !== loadingMessage.id));

      // Handle errors with user-friendly messages
      const errorInfo = formatErrorForDisplay(error);
      const errorMessage: ChatMessage = {
        id: `msg-error-${Date.now()}`,
        type: "error",
        content: `❌ **Annotation Error**\n\n${errorInfo.title}: ${
          errorInfo.message
        }${
          errorInfo.canRetry
            ? "\n\n💡 **Tip:** You can try again - this error may be temporary."
            : ""
        }`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    }
  };

  /**
   * Detect if query is about material estimation or plan analysis
   */
  const detectMaterialQuery = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const materialKeywords = [
      "material",
      "bom",
      "estimate",
      "calculate",
      "framing",
      "drywall",
      "paint",
      "stud",
      "epoxy",
      "tile",
      "carpet",
      "flooring",
      "lumber",
      "metal",
      "wall",
      "floor",
      "door",
      "doors",
      "window",
      "windows",
      "hardware",
      "hinges",
      "lockset",
      "flashing",
      "caulk",
      "sealant",
      // Refinement keywords
      "change",
      "add",
      "remove",
      "switch",
      "use",
      "height",
      "insulation",
      "frp",
      "panel",
      "door",
      "window",
      "spacing",
      // Vision/analysis keywords
      "how many",
      "count",
      "find",
      "identify",
      "analyze plan",
      "look at",
      "in the plan",
      "trim for",
    ];

    return materialKeywords.some((kw) => lowerQuery.includes(kw));
  };

  /**
   * Check if query needs vision analysis
   */
  const needsVisionAnalysis = (query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    const visionKeywords = [
      "how many doors",
      "how many windows",
      "count doors",
      "count windows",
      "find doors",
      "find windows",
      "in the plan",
      "from the plan",
      "based on plan",
      "based on the plan",
      "from the image",
      "analyze plan",
      "look at plan",
      "identify rooms",
      "see in the plan",
      "number of doors",
      "number of windows",
      "doors in",
      "windows in",
    ];

    return visionKeywords.some((kw) => lowerQuery.includes(kw));
  };

  /**
   * Handle vision-based queries
   */
  const handleVisionQuery = async (messageText: string) => {
    console.log("👁️ Vision query - analyzing plan...");
    console.log("📷 Image URL:", backgroundImage!.url);

    // Add "analyzing" message
    const analyzingMessage: ChatMessage = {
      id: `msg-analyzing-${Date.now()}`,
      type: "assistant",
      content: "👁️ Analyzing the plan image... This may take 10-15 seconds.",
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, analyzingMessage]);

    try {
      const visionResult = await materialAI.analyzePlanImage(
        messageText,
        backgroundImage!.url
      );

      // Remove analyzing message
      setChatMessages((prev) =>
        prev.filter((m) => m.id !== analyzingMessage.id)
      );

      if (!visionResult) {
        throw new Error("No response from Vision AI");
      }

      console.log("👁️ Vision AI result:", visionResult);

      // Add vision AI response to chat
      const visionMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: "assistant",
        content: visionResult.answer || "Analysis complete",
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, visionMessage]);

      // If vision found material-relevant info (doors/windows), auto-calculate trim
      const materialImpact = visionResult.materialImpact || {};
      if (materialImpact.doors || materialImpact.windows) {
        // Ask if user wants trim calculated
        const followUpMessage: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: "assistant",
          content: `Would you like me to calculate trim materials for ${
            materialImpact.doors || 0
          } doors and ${materialImpact.windows || 0} windows?`,
          timestamp: Date.now() + 1,
        };
        setChatMessages((prev) => [...prev, followUpMessage]);

        // Start dialogue with door/window counts
        startDialogue(
          `Calculate trim for ${materialImpact.doors} doors and ${materialImpact.windows} windows`
        );
        await new Promise((resolve) => setTimeout(resolve, 100));

        const currentDialogue = useCanvasStore.getState().materialDialogue;
        if (currentDialogue && currentDialogue.currentRequest) {
          updateDialogue({
            currentRequest: {
              originalQuery: currentDialogue.currentRequest.originalQuery,
              targetType: currentDialogue.currentRequest.targetType,
              targetLayer: currentDialogue.currentRequest.targetLayer,
              measurements: currentDialogue.currentRequest.measurements,
              specifications: {
                ...currentDialogue.currentRequest.specifications,
                ...materialImpact,
              },
            },
          });
        }
      }
    } catch (error) {
      console.error("Vision query error:", error);

      // Remove analyzing message
      setChatMessages((prev) =>
        prev.filter((m) => !m.id.includes("analyzing"))
      );

      // Show error
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: "error",
        content: `Vision analysis failed: ${
          error instanceof Error ? error.message : String(error)
        }\n\nTip: This feature works best in production with publicly accessible images.`,
        timestamp: Date.now(),
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    }
  };

  /**
   * Check if query is a simple door/window estimation that doesn't need OpenAI
   */
  const isSimpleDoorWindowQuery = (query: string): boolean => {
    const lowerQuery = query.toLowerCase().trim();
    // More flexible matching - just check if it contains estimate/calculate + door/window
    const hasEstimate =
      lowerQuery.includes("estimate") || lowerQuery.includes("calculate");
    const hasDoor = lowerQuery.includes("door");
    const hasWindow = lowerQuery.includes("window");
    const hasMaterial =
      lowerQuery.includes("material") ||
      lowerQuery.includes("hardware") ||
      lowerQuery.includes("trim") ||
      lowerQuery.includes("flashing") ||
      lowerQuery.includes("caulk");

    // Simple query: estimate/calculate + (door OR window) + optional material keywords
    const isSimple = hasEstimate && (hasDoor || hasWindow);

    console.log("🔍 Simple query check:", {
      query: lowerQuery,
      hasEstimate,
      hasDoor,
      hasWindow,
      hasMaterial,
      isSimple,
    });

    return isSimple;
  };

  /**
   * Handle material estimation queries
   */
  const handleMaterialEstimation = async (messageText: string) => {
    // Start or continue dialogue
    if (!dialogue) {
      startDialogue(messageText);
      await new Promise((resolve) => setTimeout(resolve, 100));

      // For simple door/window queries, skip OpenAI and use local parsing
      const currentDialogue = useCanvasStore.getState().materialDialogue;
      if (currentDialogue && currentDialogue.currentRequest) {
        const isSimpleQuery = isSimpleDoorWindowQuery(messageText);

        if (isSimpleQuery) {
          console.log(
            "✅ Simple door/window query - skipping OpenAI, using local parsing"
          );
          // Use simple keyword parsing instead of OpenAI
          const aiSpecs = parseSimpleKeywords(messageText);
          console.log("🔄 Local parsing (simple query):", aiSpecs);

          if (Object.keys(aiSpecs).length > 0) {
            updateDialogue({
              currentRequest: {
                originalQuery: currentDialogue.currentRequest.originalQuery,
                targetType: currentDialogue.currentRequest.targetType,
                targetLayer: currentDialogue.currentRequest.targetLayer,
                measurements: currentDialogue.currentRequest.measurements,
                specifications: {
                  ...currentDialogue.currentRequest.specifications,
                  ...aiSpecs,
                },
              },
            });
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        } else {
          // Complex query - try OpenAI parsing with fallback
          try {
            let aiSpecs = await materialAI.parseInitialRequest(messageText);

            // Fallback: If OpenAI didn't parse, use keywords
            if (Object.keys(aiSpecs).length === 0) {
              aiSpecs = parseSimpleKeywords(messageText);
              console.log("🔄 Fallback parsing (initial):", aiSpecs);
            } else {
              console.log("🤖 OpenAI parsed specifications:", aiSpecs);
            }

            if (Object.keys(aiSpecs).length > 0) {
              updateDialogue({
                currentRequest: {
                  originalQuery: currentDialogue.currentRequest.originalQuery,
                  targetType: currentDialogue.currentRequest.targetType,
                  targetLayer: currentDialogue.currentRequest.targetLayer,
                  measurements: currentDialogue.currentRequest.measurements,
                  specifications: {
                    ...currentDialogue.currentRequest.specifications,
                    ...aiSpecs,
                  },
                },
              });
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          } catch (openAIError) {
            console.warn(
              "⚠️ OpenAI parsing failed, using local parsing:",
              openAIError
            );
            // Fallback to local parsing if OpenAI fails
            const aiSpecs = parseSimpleKeywords(messageText);
            if (Object.keys(aiSpecs).length > 0) {
              updateDialogue({
                currentRequest: {
                  originalQuery: currentDialogue.currentRequest.originalQuery,
                  targetType: currentDialogue.currentRequest.targetType,
                  targetLayer: currentDialogue.currentRequest.targetLayer,
                  measurements: currentDialogue.currentRequest.measurements,
                  specifications: {
                    ...currentDialogue.currentRequest.specifications,
                    ...aiSpecs,
                  },
                },
              });
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
          }
        }
      }
    } else {
      // Check if this is switching to a new target area
      const currentTarget = dialogue.currentRequest?.targetType;
      const lower = messageText.toLowerCase();

      const requestingWalls =
        lower.includes("wall") && !lower.includes("drywall");
      const requestingFloors = lower.includes("floor");
      const requestingCeiling = lower.includes("ceiling");

      const isTargetSwitch =
        (requestingWalls && currentTarget !== "wall") ||
        (requestingFloors && currentTarget !== "floor") ||
        (requestingCeiling && currentTarget !== "ceiling");

      if (isTargetSwitch) {
        // Switch to new area - enable accumulation mode
        const newTarget = requestingWalls
          ? "wall"
          : requestingFloors
          ? "floor"
          : "ceiling";
        console.log(
          `🔄 Switching to ${newTarget} - enabling BOM accumulation mode`
        );

        // Enable accumulation mode so next calculation adds instead of replaces
        useCanvasStore.getState().setIsAccumulatingBOM(true);

        // Update dialogue to new target without clearing (preserves lastCalculation for BOM logic)
        updateDialogue({
          currentRequest: {
            originalQuery: messageText,
            targetType: newTarget as "wall" | "floor" | "ceiling",
            specifications: {}, // Reset specs for new area
          },
          stage: "initial" as const,
        });
        await new Promise((resolve) => setTimeout(resolve, 100));
      } else if (
        dialogue.stage === "gathering" ||
        dialogue.stage === "complete"
      ) {
        // Use OpenAI to parse the user's response/refinement
        const currentSpecs = dialogue.currentRequest?.specifications || {};
        let aiSpecs = await materialAI.parseRefinement(
          messageText,
          currentSpecs
        );

        console.log("🤖 OpenAI parsed refinement:", aiSpecs);

        // Fallback: If OpenAI didn't parse anything, use simple keyword matching
        if (Object.keys(aiSpecs).length === 0) {
          aiSpecs = parseSimpleKeywords(messageText);
          console.log("🔄 Fallback parsing:", aiSpecs);
        }

        if (Object.keys(aiSpecs).length > 0) {
          updateDialogue({
            currentRequest: {
              originalQuery:
                dialogue.currentRequest?.originalQuery || messageText,
              targetType: dialogue.currentRequest?.targetType,
              targetLayer: dialogue.currentRequest?.targetLayer,
              measurements: dialogue.currentRequest?.measurements,
              specifications: {
                ...currentSpecs,
                ...aiSpecs,
              },
            },
            stage: "calculating" as const,
          });
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    }

    const currentDialogue = useCanvasStore.getState().materialDialogue;
    if (!currentDialogue) {
      throw new Error("Failed to create dialogue");
    }

    // Process the request
    const response = await processDialogueRequest(
      currentDialogue,
      layers,
      shapes,
      scaleFactor
    );

    // For refinements, show only what changed
    // Check if this is a refinement (same measurements) or new calculation (different area)
    let messageToShow = response.message;

    if (currentDialogue.lastCalculation && response.calculation) {
      // Check if same area type (walls have length, floors have area)
      const lastCalc = currentDialogue.lastCalculation;
      const newCalc = response.calculation;

      const bothWalls = lastCalc.totalLength && newCalc.totalLength;
      const bothFloors =
        lastCalc.totalArea &&
        newCalc.totalArea &&
        !lastCalc.totalLength &&
        !newCalc.totalLength;

      const isSameTarget =
        (bothWalls || bothFloors) &&
        lastCalc.totalLength === newCalc.totalLength &&
        lastCalc.totalArea === newCalc.totalArea;

      if (isSameTarget) {
        // This is a refinement - show delta
        const { compareMaterialCalculations } = await import(
          "../services/materialService"
        );
        const changes = compareMaterialCalculations(
          currentDialogue.lastCalculation,
          response.calculation
        );

        if (changes.length > 0) {
          messageToShow = "✨ Updated estimate. Changes:\n\n";
          changes.forEach((change) => {
            if (change.difference > 0) {
              messageToShow += `✅ ${
                change.materialName
              }: +${change.difference.toFixed(0)} ${
                change.percentageChange > 0
                  ? `(+${change.percentageChange.toFixed(0)}%)`
                  : ""
              }\n`;
            } else if (change.difference < 0) {
              messageToShow += `❌ ${
                change.materialName
              }: ${change.difference.toFixed(
                0
              )} (${change.percentageChange.toFixed(0)}%)\n`;
            }
          });
          messageToShow += "\nOpen BOM Panel for full list.";
        } else {
          messageToShow = "No material changes from this adjustment.";
        }
      } else {
        // This is a new area - show full message
        messageToShow =
          response.message +
          "\n\n✅ Added to BOM. Open BOM Panel to see combined materials.";
      }
    }

    // Add AI response
    const aiMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: response.type === "estimate" ? "success" : "assistant",
      content: messageToShow,
      timestamp: Date.now(),
      metadata: {
        calculation: response.calculation,
      },
    };
    setChatMessages((prev) => [...prev, aiMessage]);

    // Update dialogue state
    if (currentDialogue) {
      updateDialogue({
        stage:
          response.type === "estimate"
            ? "complete"
            : response.type === "clarification"
            ? "gathering"
            : currentDialogue.stage,
        lastCalculation:
          response.calculation || currentDialogue.lastCalculation,
      });
    }

    // Add calculation to BOM
    if (response.calculation) {
      addCalculation(response.calculation);
    }
  };

  /**
   * Handle canvas commands (create, move, delete shapes)
   */
  const handleCanvasCommand = async (messageText: string) => {
    // Pass current view context to AI service
    const result = await processAICommand(
      messageText,
      currentView || undefined
    );

    const aiMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: result.success ? "success" : "error",
      content: result.message,
      timestamp: Date.now(),
      metadata: {
        createdShapes: result.createdShapeIds?.length,
        modifiedShapes: result.modifiedShapeIds?.length,
        deletedShapes: result.deletedShapeIds?.length,
      },
    };
    setChatMessages((prev) => [...prev, aiMessage]);
  };

  /**
   * Simple keyword parser as fallback when OpenAI fails
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseSimpleKeywords = (text: string): Record<string, any> => {
    const lower = text.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const specs: Record<string, any> = {};

    // Door/Window detection - these don't need specs, just need to be detected
    // The actual counting happens in extractMeasurementsFromLayers
    if (
      lower.includes("door") &&
      (lower.includes("hardware") ||
        lower.includes("material") ||
        lower.includes("estimate") ||
        lower.includes("calculate"))
    ) {
      // Door query detected - no specs needed, will be counted from layer
      console.log("🚪 Door query detected in parseSimpleKeywords");
    }

    if (
      lower.includes("window") &&
      (lower.includes("material") ||
        lower.includes("flashing") ||
        lower.includes("caulk") ||
        lower.includes("estimate") ||
        lower.includes("calculate"))
    ) {
      // Window query detected - no specs needed, will be counted from layer
      console.log("🪟 Window query detected in parseSimpleKeywords");
    }

    // Floor types
    if (lower.includes("epoxy") || lower.includes("epixy")) {
      specs.type = "epoxy";
    } else if (lower.includes("tile")) {
      specs.type = "tile";
    } else if (lower.includes("carpet")) {
      specs.type = "carpet";
    } else if (lower.includes("hardwood") || lower.includes("wood floor")) {
      specs.type = "hardwood";
    }

    // Framing
    if (lower.includes("lumber") || lower.includes("wood")) {
      const spacing = lower.includes("24") ? 24 : 16;
      specs.framing = { type: "lumber", spacing };
    } else if (lower.includes("metal") || lower.includes("steel")) {
      const spacing = lower.includes("24") ? 24 : 16;
      specs.framing = { type: "metal", spacing };
    }

    // Surface
    if (lower.includes("drywall")) {
      const thickness = lower.includes("5/8") ? '5/8"' : '1/2"';
      specs.surface = { type: "drywall", thickness };
    } else if (lower.includes("frp") || lower.includes("panel")) {
      const thickness = lower.includes("120") ? '0.120"' : '0.090"';
      specs.surface = { type: "frp", thickness };
    }

    // Height
    const heightMatch = lower.match(/(\d+)\s*(ft|feet|foot|')/);
    if (heightMatch) {
      specs.height = parseInt(heightMatch[1]);
    }

    // Insulation
    if (lower.includes("r-19") || lower.includes("r19")) {
      specs.insulation = { type: "batt", rValue: 19 };
    } else if (lower.includes("r-15") || lower.includes("r15")) {
      specs.insulation = { type: "batt", rValue: 15 };
    } else if (lower.includes("r-13") || lower.includes("r13")) {
      specs.insulation = { type: "batt", rValue: 13 };
    } else if (lower.includes("spray foam")) {
      specs.insulation = { type: "spray-foam", rValue: 21 };
    } else if (
      lower.includes("no insulation") ||
      lower.includes("remove insulation")
    ) {
      specs.insulation = { type: "none" };
    }

    // Doors/windows
    const doorMatch = lower.match(/(\d+)\s*door/);
    const windowMatch = lower.match(/(\d+)\s*window/);
    if (doorMatch) specs.doors = parseInt(doorMatch[1]);
    if (windowMatch) specs.windows = parseInt(windowMatch[1]);

    return specs;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearAllHistory = () => {
    setChatMessages([]);
    useCanvasStore.getState().clearAIHistory();
    useCanvasStore.getState().clearMaterialDialogue();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-t-lg">
        <div>
          <h2 className="text-lg font-semibold">AI Assistant</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-purple-100">
              Shapes, materials, and more
            </p>
            {currentView && (
              <span
                className="text-xs px-2 py-0.5 bg-white/20 rounded-full capitalize"
                title="Current view context"
              >
                {currentView}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {chatMessages.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="p-1 text-white hover:text-purple-100 rounded transition-colors"
              title="Clear history"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-white hover:text-purple-100 rounded transition-colors"
            title="Close"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <p className="font-medium">AI Assistant Ready</p>
            <div className="mt-4 text-left max-w-xs mx-auto">
              <p className="text-sm font-semibold mb-2">Try these:</p>
              <div className="space-y-2">
                <div className="bg-purple-50 p-2 rounded">
                  <p className="text-xs font-semibold text-purple-700">
                    Shape Commands
                  </p>
                  <p className="text-xs text-gray-600">"create a red circle"</p>
                  <p className="text-xs text-gray-600">"align selected left"</p>
                </div>
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-xs font-semibold text-blue-700">
                    Material Estimation
                  </p>
                  <p className="text-xs text-gray-600">
                    "calculate materials for walls"
                  </p>
                  <p className="text-xs text-gray-600">
                    "estimate floor materials"
                  </p>
                  <p className="text-xs text-gray-600">
                    "estimate doors hardware"
                  </p>
                  <p className="text-xs text-gray-600">
                    "estimate windows materials"
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          chatMessages.map((message) => (
            <UnifiedMessageBubble key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Create shapes or estimate materials..."
            disabled={isProcessing}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Unified message bubble
 */
function UnifiedMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.type === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
            : message.type === "error"
            ? "bg-red-100 text-red-900 border border-red-200"
            : message.type === "success"
            ? "bg-green-100 text-green-900 border border-green-200"
            : "bg-gray-100 text-gray-900"
        }`}
      >
        {message.type === "success" && (
          <p className="text-sm font-medium mb-1">✓ Success</p>
        )}
        {message.type === "error" && (
          <p className="text-sm font-medium mb-1">✗ Error</p>
        )}

        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Shape operation metadata */}
        {message.metadata?.createdShapes && (
          <p className="text-xs mt-2 opacity-70">
            Created {message.metadata.createdShapes} shape
            {message.metadata.createdShapes > 1 ? "s" : ""}
          </p>
        )}
        {message.metadata?.modifiedShapes &&
          message.metadata.modifiedShapes > 0 && (
            <p className="text-xs mt-1 opacity-70">
              Modified {message.metadata.modifiedShapes} shape
              {message.metadata.modifiedShapes > 1 ? "s" : ""}
            </p>
          )}
        {message.metadata?.deletedShapes &&
          message.metadata.deletedShapes > 0 && (
            <p className="text-xs mt-1 opacity-70">
              Deleted {message.metadata.deletedShapes} shape
              {message.metadata.deletedShapes > 1 ? "s" : ""}
            </p>
          )}

        {/* Material calculation preview */}
        {message.metadata?.calculation && (
          <div className="mt-2 pt-2 border-t border-gray-300">
            <p className="text-xs font-semibold mb-1">Materials:</p>
            <ul className="text-xs space-y-0.5">
              {message.metadata.calculation.materials
                .slice(0, 5)
                .map((mat, idx) => (
                  <li key={idx}>
                    {mat.name}: {mat.quantity.toFixed(0)} {mat.unit}
                  </li>
                ))}
              {message.metadata.calculation.materials.length > 5 && (
                <li className="italic">
                  + {message.metadata.calculation.materials.length - 5} more
                </li>
              )}
            </ul>
            <p className="text-xs mt-2 opacity-70">
              Open BOM Panel for full list
            </p>
          </div>
        )}

        <p className="text-xs mt-1 opacity-70">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
