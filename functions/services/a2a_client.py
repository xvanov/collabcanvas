"""A2A Protocol client for TrueCost.

Implements the Agent2Agent (A2A) protocol for inter-agent communication
using JSON-RPC 2.0 message format.
"""

from typing import Dict, Any, Optional
from uuid import uuid4
import asyncio
import importlib
import structlog
import httpx

# NOTE: `config/__init__.py` re-exports a `settings` attribute (a Settings instance),
# which can shadow the `config.settings` *module* in some import patterns.
# Use importlib to ensure we always reference the actual module.
settings_module = importlib.import_module("config.settings")
from config.errors import A2AError, ErrorCode

logger = structlog.get_logger()


class A2AClient:
    """Client for A2A protocol communication between agents.
    
    Implements JSON-RPC 2.0 message format for sending tasks to agents
    and retrieving task status.
    """
    
    def __init__(self, base_url: Optional[str] = None, timeout: Optional[int] = None):
        """Initialize A2AClient.
        
        Args:
            base_url: Base URL for A2A endpoints (default from settings).
            timeout: Request timeout in seconds (default from settings).
        """
        # Resolve settings safely even when test fixtures patch config.settings.settings
        resolved_settings = getattr(settings_module, "settings", settings_module)
        default_base_url = getattr(resolved_settings, "a2a_base_url", "http://localhost:5001")
        default_timeout = getattr(resolved_settings, "a2a_timeout_seconds", 300)

        self.base_url = base_url or default_base_url
        self.timeout = timeout or default_timeout
    
    def _create_request_id(self) -> str:
        """Generate unique request ID."""
        return str(uuid4())
    
    def _build_a2a_request(
        self,
        method: str,
        params: Dict[str, Any],
        request_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Build A2A JSON-RPC 2.0 request.
        
        Args:
            method: JSON-RPC method name.
            params: Method parameters.
            request_id: Optional request ID (generated if not provided).
            
        Returns:
            JSON-RPC 2.0 request dictionary.
        """
        return {
            "jsonrpc": "2.0",
            "id": request_id or self._create_request_id(),
            "method": method,
            "params": params
        }
    
    async def send_task(
        self,
        target_agent: str,
        message: Dict[str, Any],
        thread_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send A2A task to target agent.
        
        Args:
            target_agent: Name of the target agent (e.g., "location", "scope").
            message: Task message data.
            thread_id: Optional thread ID for conversation continuity.
            
        Returns:
            A2A JSON-RPC response.
            
        Raises:
            A2AError: If communication fails.
        """
        request_id = self._create_request_id()
        
        # Build message parts
        params = {
            "message": {
                "role": "user",
                "parts": [
                    {"type": "data", "data": message}
                ]
            }
        }
        
        # Add thread context if provided
        if thread_id:
            params["context"] = {"thread_id": thread_id}
        
        payload = self._build_a2a_request(
            method="message/send",
            params=params,
            request_id=request_id
        )
        
        endpoint = f"{self.base_url}/a2a_{target_agent}"
        
        logger.info(
            "a2a_send_task",
            target_agent=target_agent,
            request_id=request_id,
            thread_id=thread_id,
            endpoint=endpoint
        )
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    timeout=float(self.timeout)
                )
                
                response.raise_for_status()
                result = response.json()
                
                logger.info(
                    "a2a_task_response",
                    target_agent=target_agent,
                    request_id=request_id,
                    status=result.get("result", {}).get("status", "unknown")
                )
                
                return result
                
        except httpx.TimeoutException:
            logger.error(
                "a2a_timeout",
                target_agent=target_agent,
                request_id=request_id,
                timeout=self.timeout
            )
            raise A2AError(
                code=ErrorCode.A2A_TIMEOUT,
                message=f"A2A request to {target_agent} timed out after {self.timeout}s",
                target_agent=target_agent,
                details={"request_id": request_id}
            )
            
        except httpx.ConnectError as e:
            logger.error(
                "a2a_connection_error",
                target_agent=target_agent,
                request_id=request_id,
                error=str(e)
            )
            raise A2AError(
                code=ErrorCode.A2A_CONNECTION_ERROR,
                message=f"Failed to connect to {target_agent}",
                target_agent=target_agent,
                details={"request_id": request_id, "error": str(e)}
            )
            
        except httpx.HTTPStatusError as e:
            logger.error(
                "a2a_http_error",
                target_agent=target_agent,
                request_id=request_id,
                status_code=e.response.status_code,
                error=str(e)
            )
            raise A2AError(
                code=ErrorCode.A2A_INVALID_RESPONSE,
                message=f"HTTP error from {target_agent}: {e.response.status_code}",
                target_agent=target_agent,
                details={
                    "request_id": request_id,
                    "status_code": e.response.status_code
                }
            )
            
        except Exception as e:
            logger.error(
                "a2a_error",
                target_agent=target_agent,
                request_id=request_id,
                error=str(e)
            )
            raise A2AError(
                code=ErrorCode.A2A_CONNECTION_ERROR,
                message=f"A2A communication error: {str(e)}",
                target_agent=target_agent,
                details={"request_id": request_id, "error": str(e)}
            )
    
    async def get_task_status(
        self,
        target_agent: str,
        task_id: str
    ) -> Dict[str, Any]:
        """Get status of an async task.
        
        Args:
            target_agent: Name of the target agent.
            task_id: Task ID to check.
            
        Returns:
            Task status response.
        """
        request_id = self._create_request_id()
        
        payload = self._build_a2a_request(
            method="tasks/get",
            params={"task_id": task_id},
            request_id=request_id
        )
        
        endpoint = f"{self.base_url}/a2a_{target_agent}"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    endpoint,
                    json=payload,
                    timeout=30.0  # Shorter timeout for status checks
                )
                response.raise_for_status()
                return response.json()
                
        except Exception as e:
            logger.error(
                "a2a_get_status_error",
                target_agent=target_agent,
                task_id=task_id,
                error=str(e)
            )
            raise A2AError(
                code=ErrorCode.A2A_CONNECTION_ERROR,
                message=f"Failed to get task status: {str(e)}",
                target_agent=target_agent,
                details={"task_id": task_id}
            )
    
    async def wait_for_completion(
        self,
        target_agent: str,
        task_id: str,
        poll_interval: float = 2.0,
        max_wait: Optional[int] = None
    ) -> Dict[str, Any]:
        """Poll for task completion.
        
        Args:
            target_agent: Name of the target agent.
            task_id: Task ID to wait for.
            poll_interval: Seconds between polls.
            max_wait: Maximum wait time in seconds (default from settings).
            
        Returns:
            Final task response.
            
        Raises:
            A2AError: If task fails or times out.
        """
        max_wait = max_wait or self.timeout
        elapsed = 0.0
        
        while elapsed < max_wait:
            response = await self.get_task_status(target_agent, task_id)
            result = response.get("result", {})
            status = result.get("status")
            
            if status == "completed":
                return response
            elif status == "failed":
                raise A2AError(
                    code=ErrorCode.AGENT_FAILED,
                    message=f"Task {task_id} failed: {result.get('error', 'Unknown error')}",
                    target_agent=target_agent,
                    details={"task_id": task_id, "result": result}
                )
            
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        
        raise A2AError(
            code=ErrorCode.A2A_TIMEOUT,
            message=f"Task {task_id} did not complete within {max_wait}s",
            target_agent=target_agent,
            details={"task_id": task_id, "elapsed": elapsed}
        )
    
    @staticmethod
    def extract_result_data(response: Dict[str, Any]) -> Dict[str, Any]:
        """Extract result data from A2A response.
        
        Args:
            response: A2A JSON-RPC response.
            
        Returns:
            The result data from the response.
            
        Raises:
            A2AError: If response indicates failure.
        """
        result = response.get("result", {})
        status = result.get("status")
        
        if status == "failed":
            raise A2AError(
                code=ErrorCode.AGENT_FAILED,
                message=result.get("error", "Agent task failed"),
                target_agent="unknown",
                details={"response": response}
            )
        
        return result.get("result", {})



