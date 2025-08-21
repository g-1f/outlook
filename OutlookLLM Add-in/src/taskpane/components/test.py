from __future__ import annotations

import time
import uuid
import threading
import json
from typing import TypedDict, Literal, Annotated, Any, Optional
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict
from langgraph.graph import StateGraph, END, MessagesState, START
from langgraph.graph.message import AIMessage, HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent
from langgraph.types import Send

# ==============================================================================
# 1. Enhanced Type System & Core Data Models
# ==============================================================================

class JobStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class TaskType(str, Enum):
    THEMATIC_ANALYSIS = "thematic_analysis"
    JOB_STATUS_CHECK = "job_status_check"

@dataclass
class TaskRequest:
    """Structured representation of a user's task request."""
    task_type: TaskType
    parameters: dict[str, Any]
    user_input: str
    timestamp: datetime = field(default_factory=datetime.now)

class ArtifactRef(BaseModel):
    """Immutable reference to a stored data artifact."""
    model_config = ConfigDict(frozen=True)
    uri: str = Field(..., description="Storage URI for the artifact")
    schema_hash: str = Field(..., description="Hash for schema validation")
    created_at: float = Field(default_factory=time.time)
    metadata: dict[str, Any] = Field(default_factory=dict)

class ExposureFrameRef(ArtifactRef):
    """Reference to exposure analysis results."""
    pass

class OptimizationResultRef(ArtifactRef):
    """Reference to optimization results with preview data."""
    preview: dict[str, float] = Field(..., description="Preview of optimization weights")

# ==============================================================================
# 2. Enhanced Task & State Management Infrastructure
# ==============================================================================

@dataclass
class JobState:
    """Enhanced, thread-safe state for tracking background jobs."""
    job_id: str
    status: JobStatus
    task_type: TaskType
    created_at: datetime
    updated_at: datetime
    progress: float = 0.0
    result: Optional[dict] = None
    error: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)

class JobManager:
    """Thread-safe job management with in-memory storage and cleanup."""
    def __init__(self, max_jobs: int = 100):
        self._jobs: dict[str, JobState] = {}
        self._lock = threading.RLock()
        self._cleanup_threshold = max_jobs

    def create_job(self, task_type: TaskType, metadata: Optional[dict] = None) -> str:
        """Creates a new job and returns its ID."""
        job_id = f"job_{uuid.uuid4().hex[:12]}"
        now = datetime.now()
        with self._lock:
            self._jobs[job_id] = JobState(
                job_id=job_id, status=JobStatus.PENDING, task_type=task_type,
                created_at=now, updated_at=now, metadata=metadata or {}
            )
            self._cleanup_old_jobs()
        return job_id

    def update_job(self, job_id: str, **updates: Any) -> bool:
        """Updates a job's state safely."""
        with self._lock:
            if job_id not in self._jobs: return False
            job = self._jobs[job_id]
            job.updated_at = datetime.now()
            for key, value in updates.items():
                if hasattr(job, key): setattr(job, key, value)
            return True

    def get_job(self, job_id: str) -> Optional[JobState]:
        """Retrieves a job's state by its ID."""
        with self._lock:
            return self._jobs.get(job_id)

    def _cleanup_old_jobs(self):
        """Internal method to prune old, completed jobs to prevent memory leaks."""
        if len(self._jobs) <= self._cleanup_threshold: return
        sorted_jobs = sorted(self._jobs.values(), key=lambda j: j.updated_at, reverse=True)
        self._jobs = {job.job_id: job for job in sorted_jobs[:self._cleanup_threshold]}

class AsyncTaskExecutor:
    """Executes LangGraph agents in background threads with progress tracking."""
    def __init__(self, job_manager: JobManager):
        self.job_manager = job_manager

    def submit_task(self, agent_graph, job_id: str, inputs: dict):
        """Submits a graph for asynchronous execution."""
        def task_runner():
            try:
                self.job_manager.update_job(job_id, status=JobStatus.RUNNING, progress=0.1)
                final_state = None
                step_count = 0
                for state_update in agent_graph.stream(inputs):
                    step_count += 1
                    node_name = list(state_update.keys())[0]
                    final_state = state_update[node_name]
                    progress = min(0.1 + (step_count * 0.15), 0.9)
                    self.job_manager.update_job(job_id, progress=progress)
                    print(f"TASK [{job_id}]: Completed step '{node_name}' (Progress: {progress:.1%})")

                if final_state and final_state.get("error"):
                    self.job_manager.update_job(job_id, status=JobStatus.FAILED, error=final_state["error"], progress=1.0)
                else:
                    self.job_manager.update_job(job_id, status=JobStatus.SUCCEEDED, result=final_state, progress=1.0)
            except Exception as e:
                error_msg = f"Critical failure in job {job_id}: {e}"
                print(f"ERROR: {error_msg}")
                self.job_manager.update_job(job_id, status=JobStatus.FAILED, error=error_msg, progress=1.0)

        thread = threading.Thread(target=task_runner, daemon=True, name=f"Task-{job_id}")
        thread.start()

# ==============================================================================
# 3. State Definitions
# ==============================================================================

class ThematicAnalysisState(TypedDict, total=False):
    """State for the thematic analysis workflow."""
    portfolio_account: str
    thematic_query: str
    stocks: list[str]
    exposure_schema: dict[str, Any]
    batch_job_id: str
    job_status: JobStatus
    raw_exposure_ref: ExposureFrameRef
    is_verified: bool
    optimized_weights_ref: OptimizationResultRef
    error: Optional[str]

# ==============================================================================
# 4. Encapsulated Services (Capability Layer)
# ==============================================================================

class PortfolioService:
    """Encapsulated service for all portfolio-related operations."""
    VALID_ACCOUNTS = {"ACC12345", "TEST_ACCOUNT", "DEMO_001"}
    
    @classmethod
    def validate_account(cls, account_id: str) -> bool:
        print(f"SERVICE: Validating account '{account_id}'...")
        return account_id.upper() in cls.VALID_ACCOUNTS
    
    @classmethod
    def optimize_portfolio(cls, exposures_ref: ExposureFrameRef, account: str) -> OptimizationResultRef:
        print(f"SERVICE: Running optimization for account {account}...")
        time.sleep(1) # Simulate processing time
        return OptimizationResultRef(
            uri=f"s3://results/opt_{uuid.uuid4().hex[:8]}.parquet",
            schema_hash=uuid.uuid4().hex,
            preview={"AAPL": 0.35, "GOOGL": 0.25, "MSFT": 0.20, "NVDA": 0.20},
            metadata={"account": account}
        )

class BatchProcessingService:
    """Service for handling batch prediction jobs."""
    _job_counters = {}
    
    @classmethod
    def start_prediction_job(cls, stocks: list[str], schema: dict) -> str:
        job_id = f"batch_{uuid.uuid4().hex[:8]}"
        cls._job_counters[job_id] = 0
        print(f"SERVICE: Started batch prediction job {job_id} for {len(stocks)} stocks")
        return job_id
    
    @classmethod
    def check_job_status(cls, job_id: str) -> JobStatus:
        cls._job_counters[job_id] = cls._job_counters.get(job_id, 0) + 1
        status = JobStatus.SUCCEEDED if cls._job_counters[job_id] > 2 else JobStatus.RUNNING
        print(f"SERVICE: Job {job_id} status: {status.value}")
        return status
    
    @classmethod
    def get_job_results(cls, job_id: str) -> ExposureFrameRef:
        print(f"SERVICE: Fetching results for job {job_id}")
        return ExposureFrameRef(
            uri=f"s3://exposures/exp_{uuid.uuid4().hex[:8]}.parquet",
            schema_hash=uuid.uuid4().hex,
            metadata={"source_job": job_id}
        )

# ==============================================================================
# 5. Thematic Analysis Workflow (The encapsulated sub-agent graph)
# ==============================================================================

def build_thematic_analysis_workflow(llm) -> StateGraph:
    """Builds the complete, multi-step workflow for thematic analysis."""
    
    def generate_schema(state: ThematicAnalysisState) -> dict:
        # In a real system, this would be an LLM call.
        schema = {"theme": "AI_INNOVATION", "metrics": ["patent_filings", "r&d_spend"]}
        return {"exposure_schema": schema}

    def start_batch_job(state: ThematicAnalysisState) -> dict:
        job_id = BatchProcessingService.start_prediction_job(state['stocks'], state['exposure_schema'])
        return {"batch_job_id": job_id, "job_status": JobStatus.PENDING}

    def monitor_batch_job(state: ThematicAnalysisState) -> dict:
        time.sleep(1)
        status = BatchProcessingService.check_job_status(state['batch_job_id'])
        return {"job_status": status}

    def retrieve_results(state: ThematicAnalysisState) -> dict:
        return {"raw_exposure_ref": BatchProcessingService.get_job_results(state['batch_job_id'])}

    def execute_optimization(state: ThematicAnalysisState) -> dict:
        return {"optimized_weights_ref": PortfolioService.optimize_portfolio(state['raw_exposure_ref'], state['portfolio_account'])}

    workflow = StateGraph(ThematicAnalysisState)
    workflow.add_node("generate_schema", generate_schema)
    workflow.add_node("start_batch", start_batch_job)
    workflow.add_node("monitor_batch", monitor_batch_job)
    workflow.add_node("get_results", retrieve_results)
    workflow.add_node("optimize", execute_optimization)
    workflow.add_node("handle_error", lambda s: s)
    
    workflow.set_entry_point("generate_schema")
    workflow.add_edge("generate_schema", "start_batch")
    workflow.add_edge("start_batch", "monitor_batch")
    workflow.add_conditional_edges("monitor_batch", lambda s: "get_results" if s.get("job_status") == JobStatus.SUCCEEDED else "monitor_batch")
    workflow.add_edge("get_results", "optimize")
    workflow.add_edge("optimize", END)
    
    return workflow.compile()

# ==============================================================================
# 6. Specialist Agent Nodes (Interfaces to the Supervisor)
# ==============================================================================

def thematic_analysis_agent_node(state: MessagesState, job_manager: JobManager, async_executor: AsyncTaskExecutor, thematic_analysis_workflow: StateGraph) -> dict:
    """Node that receives a task from the supervisor and starts the async workflow."""
    print("--- Thematic Analysis Agent Activated ---")
    task_description = state['messages'][-1].content
    
    # Simplified parameter extraction for this example
    account = "ACC12345"
    if not PortfolioService.validate_account(account):
        return {"messages": [AIMessage(content=f"❌ Error: Account '{account}' is not valid.", name="thematic_analysis_agent")]}

    job_id = job_manager.create_job(TaskType.THEMATIC_ANALYSIS, {"account": account, "query": task_description})
    
    workflow_inputs = ThematicAnalysisState(
        portfolio_account=account,
        thematic_query=task_description,
        stocks=["AAPL", "GOOG", "MSFT", "NVDA", "TSLA"],
    )
    
    async_executor.submit_task(thematic_analysis_workflow, job_id, workflow_inputs)
    
    result = f"✅ **Thematic Analysis Started**\n**Job ID:** `{job_id}`\nUse 'status of {job_id}' to check progress."
    return {"messages": [AIMessage(content=result, name="thematic_analysis_agent")]}

def job_status_agent_node(state: MessagesState, job_manager: JobManager) -> dict:
    """Node that checks the status of a job and provides a detailed report."""
    print("--- Job Status Agent Activated ---")
    task_description = state['messages'][-1].content
    
    job_id = next((word for word in task_description.split() if word.startswith('job_')), None)
    if not job_id:
        return {"messages": [AIMessage(content="❌ Please provide a valid Job ID.", name="job_status_agent")]}

    job_state = job_manager.get_job(job_id)
    if not job_state:
        return {"messages": [AIMessage(content=f"❌ Job '{job_id}' not found.", name="job_status_agent")]}

    emoji = {"PENDING": "⏳", "RUNNING": "🔄", "SUCCEEDED": "✅", "FAILED": "❌", "CANCELLED": "⛔"}.get(job_state.status, "❓")
    progress_bar = "█" * int(job_state.progress * 10) + "░" * (10 - int(job_state.progress * 10))
    result = f"{emoji} **Job Status: {job_state.status.value}**\n**ID:** `{job_id}`\n**Progress:** [{progress_bar}] {job_state.progress:.0%}"
    
    if job_state.error:
        result += f"\n**Error:** {job_state.error}"
    if job_state.status == JobStatus.SUCCEEDED and job_state.result:
        if weights_ref_data := job_state.result.get("optimized_weights_ref"):
            result += f"\n**Results:** {weights_ref_data.preview}"

    return {"messages": [AIMessage(content=result, name="job_status_agent")]}

# ==============================================================================
# 7. Supervisor Handoff Tools
# ==============================================================================

def create_handoff_tool(agent_name: str, description: str):
    """Factory to create a tool that sends a task to another agent."""
    def handoff_tool(task_description: Annotated[str, "Detailed task description"]) -> Send:
        print(f"SUPERVISOR: Routing task to {agent_name}")
        return Send(to=agent_name, messages=[HumanMessage(content=task_description)])
    
    handoff_tool.__name__ = f"delegate_to_{agent_name}"
    handoff_tool.__doc__ = f"Delegate task to {agent_name}: {description}"
    return handoff_tool

# ==============================================================================
# 8. Main Application Class
# ==============================================================================

class PortfolioSystem:
    """Encapsulates the entire multi-agent portfolio management system."""
    def __init__(self):
        """Initializes all services and compiles the agent graph."""
        # --- A Mock LLM for demonstration purposes ---
        class EnhancedMockLLM:
            def invoke(self, messages: list, tools: list = None) -> AIMessage:
                last_content = messages[-1].content.lower()
                if any(keyword in last_content for keyword in ['status', 'progress', 'check', 'how is']):
                    return AIMessage(content="", tool_calls=[{"name": "delegate_to_job_status_agent", "args": {"task_description": messages[-1].content}, "id": f"call_{uuid.uuid4().hex[:8]}"}])
                elif any(keyword in last_content for keyword in ['thematic', 'analysis', 'analyze', 'theme', 'ai', 'innovation']):
                    return AIMessage(content="", tool_calls=[{"name": "delegate_to_thematic_analysis_agent", "args": {"task_description": messages[-1].content}, "id": f"call_{uuid.uuid4().hex[:8]}"}])
                else:
                    return AIMessage(content="I can help with: Thematic Analysis or Job Status checks. What would you like to do?")
            def bind_tools(self, tools: list):
                print(f"LLM: Binding {len(tools)} supervisor tools")
                return self

        # --- Initialize Core Services ---
        self.job_manager = JobManager()
        self.async_executor = AsyncTaskExecutor(self.job_manager)
        self.llm = EnhancedMockLLM()
        
        # --- Build Workflows & Supervisor ---
        thematic_analysis_workflow = build_thematic_analysis_workflow(self.llm)
        
        delegate_to_thematic_agent = create_handoff_tool("thematic_analysis_agent", "Handle complex thematic analysis and portfolio optimization tasks")
        delegate_to_status_agent = create_handoff_tool("job_status_agent", "Check status and progress of running jobs")
        
        supervisor_tools = [delegate_to_thematic_agent, delegate_to_status_agent]
        supervisor_agent = create_react_agent(self.llm, tools=supervisor_tools)
        
        # --- Build Main Graph ---
        main_graph = StateGraph(MessagesState)
        main_graph.add_node("supervisor", supervisor_agent)
        main_graph.add_node("thematic_analysis_agent", lambda state: thematic_analysis_agent_node(state, self.job_manager, self.async_executor, thematic_analysis_workflow))
        main_graph.add_node("job_status_agent", lambda state: job_status_agent_node(state, self.job_manager))
        
        main_graph.add_edge(START, "supervisor")
        main_graph.add_edge("thematic_analysis_agent", "supervisor")
        main_graph.add_edge("job_status_agent", "supervisor")
        
        self.agent = main_graph.compile(checkpointer=MemorySaver())

    def run_demo(self):
        """Runs a pre-defined conversational demo."""
        print("\n" + "="*60 + "\n🚀 ENHANCED LANGGRAPH PORTFOLIO MANAGEMENT SYSTEM\n" + "="*60)
        config = {"configurable": {"thread_id": f"demo_{uuid.uuid4().hex[:8]}"}}
        
        conversation_flow = [
            "Please run a thematic analysis on AI innovation for account ACC12345",
            "What's the status of that job?",
            "Check the progress again please",
        ]
        
        active_job_id = None
        for user_message in conversation_flow:
            if "status" in user_message.lower() and active_job_id:
                user_message = f"What's the status of {active_job_id}?"
            print(f"\n💬 User: {user_message}")
            
            response = self.agent.invoke({"messages": [HumanMessage(content=user_message)]}, config)
            ai_response = response['messages'][-1].content
            print(f"🤖 Assistant: {ai_response}")
            
            if "Job ID:" in ai_response:
                active_job_id = ai_response.split("`")[1]
            
            time.sleep(2.5)

        print("\n" + "="*60 + "\n✅ DEMO COMPLETED\n" + "="*60)

# ==============================================================================
# 9. Main Execution Block
# ==============================================================================

if __name__ == "__main__":
    system = PortfolioSystem()
    system.run_demo()