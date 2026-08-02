/**
 * Cloudflare Workers Handler
 * Full Integration with Cloudflare D1 SQLite Database (with KV Fallback)
 * 
 * Endpoints:
 * - GET  /api/inventory  : Fetch all warehouse items from D1/KV
 * - GET  /api/data       : Alias for /api/inventory
 * - POST /api/update     : Update or insert single item stock & record transaction log
 * - GET  /api/logs       : Fetch history transaction logs
 * - POST /api/sync       : Bulk sync all items & logs (KV/D1 backup)
 */

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        const db = env.DB || env.WAREHOUSE_D1 || env.pea_warehouse_db;

        // 1. GET /api/inventory or /api/data
        if ((url.pathname === '/api/inventory' || url.pathname === '/api/data') && request.method === 'GET') {
            try {
                if (db) {
                    const { results } = await db.prepare(`
                        SELECT 
                            code AS id, 
                            code, 
                            name, 
                            standard, 
                            current_stock, 
                            current_stock AS currentQty,
                            mb52_qty AS mb52Qty,
                            wms_qty AS wmsQty,
                            kk23_qty AS kk23Qty,
                            unit,
                            category,
                            image_url AS imageUrl,
                            updated_at AS lastUpdated
                        FROM items 
                        ORDER BY rowid ASC
                    `).all();

                    return new Response(JSON.stringify(results || []), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                } else if (env && env.WAREHOUSE_KV) {
                    const kvData = await env.WAREHOUSE_KV.get('pea_warehouse_db', { type: 'json' });
                    return new Response(JSON.stringify(kvData || []), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                return new Response(JSON.stringify([]), {
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            } catch (err) {
                console.error("D1 Get Error:", err);
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        // 2. GET /api/logs
        if (url.pathname === '/api/logs' && request.method === 'GET') {
            try {
                if (db) {
                    const { results } = await db.prepare(`
                        SELECT id, timestamp, type, item_code AS itemCode, item_name AS itemName, qty, current_stock AS currentStock, requester, work_order AS workOrder, note
                        FROM logs
                        ORDER BY timestamp DESC
                        LIMIT 200
                    `).all();

                    return new Response(JSON.stringify(results || []), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                } else if (env && env.WAREHOUSE_KV) {
                    const kvLogs = await env.WAREHOUSE_KV.get('pea_warehouse_logs', { type: 'json' });
                    return new Response(JSON.stringify(kvLogs || []), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                return new Response(JSON.stringify([]), { headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ error: err.message }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        // 3. POST /api/update
        if (url.pathname === '/api/update' && request.method === 'POST') {
            try {
                const body = await request.json();
                const { code, currentQty, mb52Qty, wmsQty, kk23Qty, log } = body;

                if (db && code) {
                    await db.prepare(`
                        INSERT INTO items (code, current_stock, mb52_qty, wms_qty, kk23_qty, updated_at)
                        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(code) DO UPDATE SET
                            current_stock = COALESCE(?, current_stock),
                            mb52_qty = COALESCE(?, mb52_qty),
                            wms_qty = COALESCE(?, wms_qty),
                            kk23_qty = COALESCE(?, kk23_qty),
                            updated_at = CURRENT_TIMESTAMP
                    `).bind(code, currentQty, mb52Qty, wmsQty, kk23Qty, currentQty, mb52Qty, wmsQty, kk23Qty).run();

                    if (log) {
                        await db.prepare(`
                            INSERT INTO logs (timestamp, type, item_code, item_name, qty, current_stock, requester, work_order, note)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `).bind(
                            log.timestamp || new Date().toISOString(),
                            log.type || 'update',
                            log.itemCode || code,
                            log.itemName || '',
                            log.qty || 0,
                            log.currentStock || currentQty || 0,
                            log.requester || '',
                            log.workOrder || '',
                            log.note || ''
                        ).run();
                    }

                    return new Response(JSON.stringify({ success: true, mode: 'd1' }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        // 4. POST /api/sync
        if (url.pathname === '/api/sync' && request.method === 'POST') {
            try {
                const body = await request.json();

                if (db && Array.isArray(body)) {
                    const stmt = db.prepare(`
                        INSERT INTO items (code, name, standard, current_stock, mb52_qty, wms_qty, kk23_qty, unit, category, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ON CONFLICT(code) DO UPDATE SET
                            current_stock = excluded.current_stock,
                            mb52_qty = excluded.mb52_qty,
                            wms_qty = excluded.wms_qty,
                            kk23_qty = excluded.kk23_qty,
                            updated_at = CURRENT_TIMESTAMP
                    `);

                    const batchStatements = body.map(item => stmt.bind(
                        item.code, 
                        item.name || '', 
                        item.standard || 0, 
                        item.currentQty || 0,
                        item.mb52Qty || 0,
                        item.wmsQty || 0,
                        item.kk23Qty || 0,
                        item.unit || '',
                        item.category || ''
                    ));

                    await db.batch(batchStatements);

                    return new Response(JSON.stringify({ success: true, count: body.length, mode: 'd1_batch' }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                } else if (env && env.WAREHOUSE_KV) {
                    await env.WAREHOUSE_KV.put('pea_warehouse_db', JSON.stringify(body));
                    return new Response(JSON.stringify({ success: true, mode: 'kv' }), {
                        headers: { 'Content-Type': 'application/json', ...corsHeaders }
                    });
                }

                return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
            } catch (err) {
                return new Response(JSON.stringify({ success: false, error: err.message }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders }
                });
            }
        }

        // Route /charts and /charts/ to charts.html
        if (url.pathname === '/charts' || url.pathname === '/charts/') {
            const chartsUrl = new URL('/charts.html', request.url);
            if (env && env.ASSETS) {
                return env.ASSETS.fetch(new Request(chartsUrl, request));
            }
        }

        // Static Asset Pass-through for Cloudflare Pages/Workers
        if (env && env.ASSETS) {
            return env.ASSETS.fetch(request);
        }

        return fetch(request);
    }
};
