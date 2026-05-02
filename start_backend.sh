#!/bin/bash
cd /home/tharun-gowda-p-r/Documents/idp/Nutritional-Assistant/backend
exec python3 -m uvicorn main:app --host 0.0.0.0 --port 8000