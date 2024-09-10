# Use the official Bun image as the base
FROM docker.io/oven/bun:1

# Install build essentials and Python
RUN apt-get update && apt-get install -y build-essential python3

# Set the working directory in the container
WORKDIR /app

# Copy package.json and bun.lockb (if exists)
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Command to run the application
CMD ["bun", "index.ts"]
