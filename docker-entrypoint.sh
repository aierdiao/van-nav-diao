#!/bin/sh
set -e

DEMO_USER="moonscape6650"
DEMO_PASS='d5Rx5F%%c18r'

if [ "$DEMO_MODE" = "true" ] && [ ! -f /app/data/nav.db ]; then
    echo "🌱 Demo mode: First run detected, seeding database..."

    # Step 1: Reset admin password (also initializes the DB)
    /app/van-nav -reset-password "$DEMO_PASS"

    # Step 2: Start app in background for API calls
    /app/van-nav -addr 127.0.0.1 -port 6412 &
    APP_PID=$!

    # Step 3: Wait for app to be ready
    echo "Waiting for app to start..."
    READY=0
    for i in $(seq 1 30); do
        if curl -sf http://127.0.0.1:6412/api/theme > /dev/null 2>&1; then
            READY=1
            break
        fi
        sleep 1
    done

    if [ "$READY" = "1" ]; then
        # Step 4: Login to get JWT token
        TOKEN=$(curl -sf -X POST http://127.0.0.1:6412/api/login \
            -H 'Content-Type: application/json' \
            -d '{"name":"admin","password":"'"$DEMO_PASS"'"}' \
            | sed 's/.*"token":"\([^"]*\)".*/\1/')

        if [ -n "$TOKEN" ]; then
            # Step 5: Import seed config
            echo "Importing seed data..."
            curl -sf -X POST http://127.0.0.1:6412/api/admin/importConfig \
                -H 'Content-Type: application/json' \
                -H "Authorization: Bearer $TOKEN" \
                -d @/app/seed-data.json

            # Step 6: Update admin username
            echo "Setting demo username..."
            curl -sf -X PUT http://127.0.0.1:6412/api/admin/user \
                -H 'Content-Type: application/json' \
                -H "Authorization: Bearer $TOKEN" \
                -d '{"id":1,"name":"'"$DEMO_USER"'","password":"'"$DEMO_PASS"'"}'

            echo "✅ Demo mode: Seed data imported, account set to $DEMO_USER"
        else
            echo "⚠️  Demo mode: Login failed, skipping seed import"
        fi
    else
        echo "⚠️  Demo mode: App failed to start within 30s, skipping seed import"
    fi

    # Step 7: Stop background app
    kill $APP_PID 2>/dev/null || true
    wait $APP_PID 2>/dev/null || true
    echo "Demo mode: Seed complete, starting app normally..."
fi

# Start the app
exec /app/van-nav -addr 0.0.0.0 -port 6412 "$@"
