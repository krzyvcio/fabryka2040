   # MEMORY.md - Current Status & TODO

## CURRENT PROBLEM
🔴 Express API server won't start - DuckDB database file is locked by bun processes
- Error: "Proces nie może uzyskać dostępu do pliku, ponieważ jest on już używany przez inny proces"
- Created `killbun.ps1` script to aggressively kill all bun processes and clean DB files
- Even after killing processes, bun still holds lock on neuroforge.db

## ROOT CAUSE ANALYSIS
- `db.ts` opens DuckDB connection but may not close it properly
- Server.ts calls `startAPIServer()` which initializes DB
- When process exits, connection isn't being closed gracefully
- DuckDB file handles persist even after process death (Windows file locking issue)

## COMPLETED TASKS ✅
1. ✅ Created Express-based API server to replace Fastify
2. ✅ Updated package.json with Express dependency
3. ✅ Created /web folder with HTML/CSS/JS UI
4. ✅ Extended database schema with 4 conversation tables
5. ✅ Created conversationLogger.ts module
6. ✅ Integrated conversation logging into neuroforge-debate.ts
7. ✅ Fixed BigInt serialization in API responses
8. ✅ Fixed timestamp conversion (micros to ISO string)
9. ✅ Created killbun.ps1 cleanup script

## TODO - PRIORITY ORDER

### BLOCKING ISSUE: Fix DuckDB Connection Management
1. **Modify db.ts:**
   - Add proper connection cleanup in `closeDatabase()` 
   - Ensure `conn.close()` is called before `db.close()`
   - Add timeout to force close connections if needed
   
2. **Modify server.ts:**
   - Add signal handlers (SIGINT, SIGTERM) to gracefully close DB
   - Call `closeDatabase()` before process.exit()

3. **Test Express Server:**
   - Run: `.\killbun.ps1; bun run server.ts`
   - Verify it starts without database lock error
   - Test: `curl http://localhost:3000/api/health`

### AFTER SERVER WORKS: Data Generation & Testing
4. **Generate Conversation Data:**
   - Run: `.\killbun.ps1; bun run neuroforge-debate.ts` 
   - Let it complete at least 1-2 days
   - Database should populate with conversations}  

5. **Test API Endpoints:**
   - GET /api/health
   - GET /api/conversations
   - GET /api/conversations/<id>
   - GET /api/conversations/<id>/messages
   - GET /api/conversations/<id>/context

6. **Test Web UI:**
   - Navigate to http://localhost:3000
   - Verify conversation list loads
   - Click to view individual conversations
   - Check emotion indicators and context panels

### NICE-TO-HAVE: Optimization
7. Performance tuning (pagination, indexing)
8. Add export/backup functionality
9. Add database statistics dashboard

## KEY FILES
- `api.ts` - Express server with API endpoints
- `db.ts` - DuckDB initialization and queries (NEEDS FIX)
- `server.ts` - Entry point (NEEDS SIGNAL HANDLERS)
- `conversationLogger.ts` - Session logging
- `neuroforge-debate.ts` - Main debate simulation (already integrated)
- `killbun.ps1` - Process cleanup script
- `/web/` - Static HTML/CSS/JS UI

## COMMANDS
```powershell
# Kill all bun processes and clean database
.\killbun.ps1

# Start Express server
bun run server.ts

# Start debate system
bun run neuroforge-debate.ts

# Check API
curl http://localhost:3000/api/health

# Open web UI
Start-Process http://localhost:3000
```

## NOTES
- Database path: `c:\projekty\fabryka2040\neuroforge.db`
- API port: 3000
- Server runs on: 127.0.0.1:3000
- Conversations stored with: id, day, topic, scenario, messages, context, emotions
