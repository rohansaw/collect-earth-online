# Base image
FROM ubuntu:20.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive \
    JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=defaultpassword

# Install dependencies
RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    postgresql-12 \
    postgresql-12-postgis-3 \
    p7zip-full \
    python3 \
    python3-pip \
    curl \
    gnupg \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Clojure
RUN curl -L -O https://github.com/clojure/brew-install/releases/latest/download/linux-install.sh && \
chmod +x linux-install.sh && \
./linux-install.sh

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Set up the application directory
WORKDIR /app

# Copy application files
COPY . /app

# Initialize and configure PostgreSQL

RUN service postgresql start && \
    su - postgres -c "psql -c \"ALTER USER postgres PASSWORD '${POSTGRES_PASSWORD}';\""

# Build the database schema and functions
RUN clojure -M:build-db build-all --dev-data

# Install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip3 install --no-cache-dir -r /app/requirements.txt
RUN pip3 install --no-cache-dir earthengine-api --upgrade

# Install Node.js dependencies
RUN npm install

# Expose required ports
EXPOSE 8080
EXPOSE 8443
EXPOSE 5173
EXPOSE 5555

# Start the application
# CMD ["sh", "-c", "npm run vite-dev & npm run server-dev"]
