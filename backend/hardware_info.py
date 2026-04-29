import sys
import platform
import asyncio

try:
    import torch
    import psutil
except ImportError:
    torch = None
    psutil = None


def _get_system_info_internal():
    """Get system OS info (blocking, runs in executor)."""
    os_name = platform.system()
    # Convert Darwin to macOS for user-friendly display
    if os_name == "Darwin":
        os_name = "macOS"

    if torch is None:
        return {
            "os": os_name,
            "device": "cpu",
            "deviceName": "CPU",
            "memory": "Unknown",
        }

    device = "cpu"
    device_name = "CPU"

    if torch.cuda.is_available():
        device = "cuda"
        device_name = f"CUDA: {torch.cuda.get_device_name(0)}"
    elif platform.system() == "Darwin":
        try:
            if torch.backends.mps.is_available():
                device = "mps"
                device_name = "Apple MPS"
        except Exception:
            pass

    memory = "Unknown"
    try:
        if device == "cuda":
            mem = torch.cuda.get_device_properties(0)
            memory = f"{round(mem.total_memory / (1024**3), 1)} GB"
        elif psutil is not None:
            vm = psutil.virtual_memory()
            memory = f"{round(vm.total / (1024**3), 1)} GB"
    except Exception:
        pass

    return {
        "os": os_name,
        "device": device,
        "deviceName": device_name,
        "memory": memory,
    }


_system_info_cache = None


async def get_system_info():
    """Get system OS info (cached after first call)."""
    global _system_info_cache
    if _system_info_cache is not None:
        return _system_info_cache
    loop = asyncio.get_event_loop()
    _system_info_cache = await loop.run_in_executor(None, _get_system_info_internal)
    return _system_info_cache


async def handle_model_get_status(_p):
    """Get model status and device information."""
    sys_info = await get_system_info()
    return {"ready": _p.get("is_model_ready")(), "device": sys_info["device"]}
