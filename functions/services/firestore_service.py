"""Firestore service for TrueCost.

Provides CRUD operations for estimates and agent outputs.
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import structlog

from firebase_admin import firestore
from google.cloud.firestore_v1 import AsyncClient

from config.errors import TrueCostError, ErrorCode

logger = structlog.get_logger()


class FirestoreService:
    """Service for Firestore operations.
    
    Handles all database operations for estimates, agent outputs,
    and pipeline status updates.
    """
    
    COLLECTION_ESTIMATES = "estimates"
    SUBCOLLECTION_AGENT_OUTPUTS = "agentOutputs"
    SUBCOLLECTION_CONVERSATIONS = "conversations"
    SUBCOLLECTION_VERSIONS = "versions"
    
    def __init__(self, db: Optional[AsyncClient] = None):
        """Initialize FirestoreService.
        
        Args:
            db: Optional Firestore client. If not provided, uses default.
        """
        self._db = db
    
    @property
    def db(self) -> AsyncClient:
        """Get Firestore client (lazy initialization)."""
        if self._db is None:
            self._db = firestore.client()
        return self._db
    
    async def get_estimate(self, estimate_id: str) -> Optional[Dict[str, Any]]:
        """Fetch estimate document by ID.
        
        Args:
            estimate_id: The estimate document ID.
            
        Returns:
            Estimate document data or None if not found.
            
        Raises:
            TrueCostError: If Firestore operation fails.
        """
        try:
            doc_ref = self.db.collection(self.COLLECTION_ESTIMATES).document(estimate_id)
            doc = await doc_ref.get()
            
            if doc.exists:
                return {"id": doc.id, **doc.to_dict()}
            return None
            
        except Exception as e:
            logger.error("firestore_get_failed", estimate_id=estimate_id, error=str(e))
            raise TrueCostError(
                code=ErrorCode.FIRESTORE_ERROR,
                message=f"Failed to get estimate: {str(e)}",
                details={"estimate_id": estimate_id}
            )
    
    async def update_estimate(
        self,
        estimate_id: str,
        data: Dict[str, Any]
    ) -> None:
        """Update estimate document.
        
        Args:
            estimate_id: The estimate document ID.
            data: Fields to update (supports dot notation for nested fields).
            
        Raises:
            TrueCostError: If Firestore operation fails.
        """
        try:
            doc_ref = self.db.collection(self.COLLECTION_ESTIMATES).document(estimate_id)
            
            # Add timestamp
            data["updatedAt"] = firestore.SERVER_TIMESTAMP
            
            await doc_ref.update(data)
            logger.info("estimate_updated", estimate_id=estimate_id, fields=list(data.keys()))
            
        except Exception as e:
            logger.error("firestore_update_failed", estimate_id=estimate_id, error=str(e))
            raise TrueCostError(
                code=ErrorCode.FIRESTORE_WRITE_FAILED,
                message=f"Failed to update estimate: {str(e)}",
                details={"estimate_id": estimate_id}
            )
    
    async def update_agent_status(
        self,
        estimate_id: str,
        agent_name: str,
        status: str,
        retry: Optional[int] = None
    ) -> None:
        """Update pipeline status for an agent.
        
        Args:
            estimate_id: The estimate document ID.
            agent_name: Name of the agent.
            status: Status string (pending, running, completed, failed).
            retry: Optional retry attempt number.
        """
        update_data = {
            f"pipelineStatus.agentStatuses.{agent_name}": status,
            "pipelineStatus.currentAgent": agent_name,
            "pipelineStatus.lastUpdated": firestore.SERVER_TIMESTAMP
        }
        
        if retry is not None:
            update_data[f"pipelineStatus.retries.{agent_name}"] = retry
        
        await self.update_estimate(estimate_id, update_data)
        logger.info("agent_status_updated", estimate_id=estimate_id, agent=agent_name, status=status)
    
    async def save_agent_output(
        self,
        estimate_id: str,
        agent_name: str,
        output: Dict[str, Any],
        summary: Optional[str] = None,
        confidence: Optional[float] = None,
        tokens_used: Optional[int] = None,
        duration_ms: Optional[int] = None,
        score: Optional[int] = None
    ) -> None:
        """Save agent output to subcollection.
        
        Args:
            estimate_id: The estimate document ID.
            agent_name: Name of the agent.
            output: Agent output data.
            summary: Human-readable summary.
            confidence: Confidence score (0-1).
            tokens_used: Number of LLM tokens used.
            duration_ms: Processing duration in milliseconds.
            score: Scorer agent score (0-100).
            
        Raises:
            TrueCostError: If Firestore operation fails.
        """
        try:
            doc_ref = (
                self.db
                .collection(self.COLLECTION_ESTIMATES)
                .document(estimate_id)
                .collection(self.SUBCOLLECTION_AGENT_OUTPUTS)
                .document(agent_name)
            )
            
            agent_output_data = {
                "status": "completed",
                "output": output,
                "summary": summary,
                "confidence": confidence,
                "tokensUsed": tokens_used,
                "durationMs": duration_ms,
                "score": score,
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            
            # Remove None values
            agent_output_data = {k: v for k, v in agent_output_data.items() if v is not None}
            
            await doc_ref.set(agent_output_data)
            
            # Also update the main estimate document with agent output
            await self.update_estimate(estimate_id, {
                f"{agent_name}Output": output,
                f"pipelineStatus.agentStatuses.{agent_name}": "completed"
            })
            
            logger.info(
                "agent_output_saved",
                estimate_id=estimate_id,
                agent=agent_name,
                tokens=tokens_used,
                duration_ms=duration_ms
            )
            
        except Exception as e:
            logger.error(
                "agent_output_save_failed",
                estimate_id=estimate_id,
                agent=agent_name,
                error=str(e)
            )
            raise TrueCostError(
                code=ErrorCode.FIRESTORE_WRITE_FAILED,
                message=f"Failed to save agent output: {str(e)}",
                details={"estimate_id": estimate_id, "agent_name": agent_name}
            )
    
    async def get_agent_output(
        self,
        estimate_id: str,
        agent_name: str
    ) -> Optional[Dict[str, Any]]:
        """Get agent output from subcollection.
        
        Args:
            estimate_id: The estimate document ID.
            agent_name: Name of the agent.
            
        Returns:
            Agent output data or None if not found.
        """
        try:
            doc_ref = (
                self.db
                .collection(self.COLLECTION_ESTIMATES)
                .document(estimate_id)
                .collection(self.SUBCOLLECTION_AGENT_OUTPUTS)
                .document(agent_name)
            )
            
            doc = await doc_ref.get()
            if doc.exists:
                return doc.to_dict()
            return None
            
        except Exception as e:
            logger.error(
                "agent_output_get_failed",
                estimate_id=estimate_id,
                agent=agent_name,
                error=str(e)
            )
            return None
    
    async def delete_estimate(self, estimate_id: str) -> None:
        """Delete estimate and all subcollections.
        
        Args:
            estimate_id: The estimate document ID.
            
        Raises:
            TrueCostError: If Firestore operation fails.
        """
        try:
            estimate_ref = self.db.collection(self.COLLECTION_ESTIMATES).document(estimate_id)
            
            # Delete subcollections
            subcollections = [
                self.SUBCOLLECTION_AGENT_OUTPUTS,
                self.SUBCOLLECTION_CONVERSATIONS,
                self.SUBCOLLECTION_VERSIONS
            ]
            
            for subcollection_name in subcollections:
                subcollection = estimate_ref.collection(subcollection_name)
                docs = subcollection.stream()
                async for doc in docs:
                    await doc.reference.delete()
            
            # Delete main document
            await estimate_ref.delete()
            
            logger.info("estimate_deleted", estimate_id=estimate_id)
            
        except Exception as e:
            logger.error("estimate_delete_failed", estimate_id=estimate_id, error=str(e))
            raise TrueCostError(
                code=ErrorCode.FIRESTORE_ERROR,
                message=f"Failed to delete estimate: {str(e)}",
                details={"estimate_id": estimate_id}
            )
    
    async def create_estimate(
        self,
        estimate_id: str,
        user_id: str,
        clarification_output: Dict[str, Any]
    ) -> str:
        """Create a new estimate document.
        
        Args:
            estimate_id: The estimate document ID.
            user_id: The user's ID.
            clarification_output: ClarificationOutput from Dev 3.
            
        Returns:
            The created estimate ID.
        """
        try:
            doc_ref = self.db.collection(self.COLLECTION_ESTIMATES).document(estimate_id)
            
            estimate_data = {
                "userId": user_id,
                "status": "processing",
                "clarificationOutput": clarification_output,
                "pipelineStatus": {
                    "currentAgent": None,
                    "completedAgents": [],
                    "progress": 0,
                    "agentStatuses": {},
                    "scores": {},
                    "retries": {}
                },
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP
            }
            
            await doc_ref.set(estimate_data)
            logger.info("estimate_created", estimate_id=estimate_id, user_id=user_id)
            
            return estimate_id
            
        except Exception as e:
            logger.error("estimate_create_failed", estimate_id=estimate_id, error=str(e))
            raise TrueCostError(
                code=ErrorCode.FIRESTORE_WRITE_FAILED,
                message=f"Failed to create estimate: {str(e)}",
                details={"estimate_id": estimate_id}
            )

