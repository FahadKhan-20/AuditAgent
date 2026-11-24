FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive \
    PATH="/root/.foundry/bin:${PATH}"

# Install system dependencies, solc dependencies, curl, and git
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    git \
    libssl-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash && \
    /root/.foundry/bin/foundryup

# Install solc-select and configure Solidity 0.8.20
RUN pip install --no-cache-dir solc-select slither-analyzer && \
    solc-select install 0.8.20 && \
    solc-select use 0.8.20

WORKDIR /app

# Install Python requirements
COPY apps/agent/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and sample fixtures
COPY apps/agent/ ./apps/agent/
COPY contracts-samples/ ./contracts-samples/

EXPOSE 8000

CMD ["uvicorn", "apps.agent.src.main:app", "--host", "0.0.0.0", "--port", "8000"]
