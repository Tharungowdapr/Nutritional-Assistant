#!/usr/bin/env python3
"""Run helper for the NutriSync backend.

This ensures the backend app can be started directly from the backend
directory (so local imports like `import config` resolve correctly).
"""
import uvicorn


if __name__ == "__main__":
    # Use module path so reload works during development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
