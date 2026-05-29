# ============================================================
# Stage 1: Frontend Build
# ============================================================
FROM node:22-alpine AS frontend
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate
WORKDIR /build
COPY ui/package.json ui/pnpm-lock.yaml ./ui/
RUN cd ui && pnpm install --frozen-lockfile
COPY ui/ ./ui/
RUN cd ui && CI=false pnpm build

# ============================================================
# Stage 2: Backend Build
# ============================================================
FROM golang:1.23-alpine AS backend
RUN apk --no-cache add git
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=frontend /build/ui/build /build/public
RUN GONOSUMCHECK=* GOFLAGS=-mod=mod go build -o van-nav .

# ============================================================
# Stage 3: Final Runtime Image
# ============================================================
FROM alpine:latest
ENV TZ=Asia/Shanghai
RUN apk --no-cache add ca-certificates tzdata && \
    cp "/usr/share/zoneinfo/$TZ" /etc/localtime && \
    echo "$TZ" > /etc/timezone
WORKDIR /app
COPY --from=backend /build/van-nav /app/van-nav

VOLUME ["/app/data"]
EXPOSE 6412
ENTRYPOINT ["/app/van-nav", "-addr", "0.0.0.0", "-port", "6412"]
