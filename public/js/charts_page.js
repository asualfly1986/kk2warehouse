/**
 * PEA Warehouse Analytics - Dedicated Charts Page Controller
 * Handles chart initialization, real-time data sync, and interactive visual rendering
 */
class ChartsPageController {
    constructor() {
        this.db = window.db || new StockDatabase();
        this.barPage = 0;
        this.pageSize = 20;
        this.searchQuery = "";
        this.selectedCategory = "all";
        this.deficitViewMode = "top15"; // Default to Top 15 for clean presentation view
        this.kpiCardFilter = "all"; // Interactive KPI Card Filter State
        this.trendMonthRange = 6; // Default to 6 range steps
        this.trendGranularity = "weekly"; // Default to weekly breakdown as requested
        this.selectedTrendItemCode = "all"; // Default to all items
        this.logsSearchQuery = ""; // Logs Table Search Query
        this.logsTypeFilter = "all"; // Logs Table Type Filter State

        // Chart instances
        this.doughnutChart = null;
        this.locationChart = null;
        this.topDeficitChart = null;
        this.mainBarChart = null;
        this.monthlyTrendChart = null;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.init());
        } else {
            this.init();
        }
    }

    handleKpiCardClick(filterKey) {
        if (this.kpiCardFilter === filterKey && filterKey !== 'all') {
            this.kpiCardFilter = 'all';
        } else {
            this.kpiCardFilter = filterKey;
        }

        // Highlight active KPI card with active glow styles
        const cardTotal = document.getElementById("kpiCardTotal");
        const cardOut = document.getElementById("kpiCardOut");
        const cardLow = document.getElementById("kpiCardLow");
        const cardGood = document.getElementById("kpiCardGood");

        const cards = [cardTotal, cardOut, cardLow, cardGood];
        cards.forEach(c => {
            if (c) {
                c.classList.remove("active-kpi-card", "active-kpi-card-red", "active-kpi-card-orange", "active-kpi-card-green");
            }
        });

        if (this.kpiCardFilter === 'out_of_stock' && cardOut) {
            cardOut.classList.add("active-kpi-card-red");
        } else if (this.kpiCardFilter === 'low' && cardLow) {
            cardLow.classList.add("active-kpi-card-orange");
        } else if (this.kpiCardFilter === 'good_group' && cardGood) {
            cardGood.classList.add("active-kpi-card-green");
        } else if (cardTotal) {
            cardTotal.classList.add("active-kpi-card");
        }

        // Filter all items by KPI selection
        const allItems = this.db.getItems();
        let targetItems = allItems;

        if (this.kpiCardFilter === 'out_of_stock') {
            targetItems = allItems.filter(i => {
                const s = window.getItemStatus(i.currentQty, i.standard);
                return s.key === 'out_of_stock';
            });
        } else if (this.kpiCardFilter === 'low') {
            targetItems = allItems.filter(i => {
                const s = window.getItemStatus(i.currentQty, i.standard);
                return s.key === 'low';
            });
        } else if (this.kpiCardFilter === 'good_group') {
            targetItems = allItems.filter(i => {
                const s = window.getItemStatus(i.currentQty, i.standard);
                return ['good', 'full', 'normal', 'over'].includes(s.key);
            });
        }

        // Update Location Chart filter pill
        const filterPillEl = document.getElementById("filterPillChartLocations");
        const subtitleEl = document.getElementById("subtitleChartLocations");

        const kpiLabels = {
            all: "📦 พัสดุทั้งหมด",
            out_of_stock: "🚨 ขาดสต็อกจัดซื้อด่วน (<50%)",
            low: "⚠️ เตือนสต็อกต่ำ (50-60%)",
            good_group: "🟢 สต็อกอยู่ในเกณฑ์ดี (>=60%)"
        };

        if (this.kpiCardFilter !== 'all') {
            if (filterPillEl) {
                filterPillEl.innerHTML = `
                    <div style="background: rgba(59, 130, 246, 0.25); border: 1px solid #3b82f6; color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="chartsPage.handleKpiCardClick('all')" title="คลิกเพื่อล้างตัวกรอง">
                        <span>✨ กรองจากปุ่ม KPI: ${kpiLabels[this.kpiCardFilter]} (${targetItems.length} รายการ)</span>
                        <span style="background: #ef4444; color: #ffffff; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✕</span>
                    </div>
                `;
            }
            if (subtitleEl) {
                subtitleEl.textContent = `ยอดรวมใน 4 คลังเฉพาะกลุ่ม [${kpiLabels[this.kpiCardFilter]}] (${targetItems.length} รายการ)`;
            }
        } else {
            if (filterPillEl) filterPillEl.innerHTML = "";
            if (subtitleEl) subtitleEl.textContent = "เปรียบเทียบยอดรวมทั้งหมดใน 2601, MB52, WMS และ sloc 0023";
        }

        // Re-render all charts and data table with targetItems!
        this.renderLocationsChart(targetItems);
        this.renderMainBarChart(targetItems);
        this.renderTopDeficitChart(targetItems);
        this.renderStockTable(targetItems);
    }

    async init() {
        try {
            if (typeof this.db.syncFromCloudflare === "function") {
                await this.db.syncFromCloudflare();
            }
        } catch (err) {
            console.warn("Cloud D1 sync fallback to local storage:", err);
        }
        this.ensureHistoricalLogs();
        this.updateLastUpdatedTimestamp();
        this.populateTrendItemDropdown();
        this.renderKpis();
        this.renderAllCharts();
        this.renderLogsTable();
        this.renderCategoryPills();
        this.renderStockTable();
    }

    async refreshAllCharts() {
        try {
            if (typeof this.db.syncFromCloudflare === "function") {
                await this.db.syncFromCloudflare();
            }
        } catch (err) {}
        this.ensureHistoricalLogs();
        this.updateLastUpdatedTimestamp();
        this.populateTrendItemDropdown();
        this.renderKpis();
        this.renderAllCharts();
        this.renderLogsTable();
        this.renderCategoryPills();
        this.renderStockTable();
    }

    updateLastUpdatedTimestamp() {
        const el = document.getElementById("chartsLastUpdated");
        if (!el) return;
        const now = new Date();
        const formattedDate = now.toLocaleDateString("th-TH", {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        el.textContent = `${formattedDate} น. (เรียลไทม์)`;
    }

    renderKpis() {
        const stats = this.db.getStats ? this.db.getStats() : { totalSKU: 0, outOfStockCount: 0, lowCount: 0, goodCount: 0, fullCount: 0, normalCount: 0 };
        
        const elTotal = document.getElementById("kpiTotalItems");
        const elOut = document.getElementById("kpiOutOfStock");
        const elLow = document.getElementById("kpiLowStock");
        const elGood = document.getElementById("kpiGoodStock");

        if (elTotal) elTotal.textContent = stats.totalSKU || 0;
        if (elOut) elOut.textContent = stats.outOfStockCount || 0;
        if (elLow) elLow.textContent = stats.lowCount || 0;
        if (elGood) elGood.textContent = (stats.goodCount || 0) + (stats.fullCount || 0) + (stats.normalCount || 0);
    }

    renderAllCharts() {
        if (typeof Chart === "undefined") return;

        const stats = this.db.getStats ? this.db.getStats() : { overCount: 0, fullCount: 0, goodCount: 0, normalCount: 0, lowCount: 0, outOfStockCount: 0 };
        const items = this.db.getItems();

        // 1. Doughnut Chart: Stock Status Breakdown
        this.renderDoughnutChart(stats);

        // 2. Bar Chart: Warehouse Locations Total Quantities
        this.renderLocationsChart(items);

        // 3. Horizontal Bar Chart: Top 10 Stock Deficit Items
        this.renderTopDeficitChart(items);

        // 4. Main Bar Chart: Stock vs Standard with Pagination
        this.renderMainBarChart(items);

        // 5. Line/Area Chart: Monthly Movements & Trends
        this.renderMonthlyTrendChart();
    }

    renderDoughnutChart(stats) {
        const canvas = document.getElementById("chartStatusDoughnut");
        if (!canvas) return;

        if (this.doughnutChart) this.doughnutChart.destroy();
        const ctx = canvas.getContext("2d");

        this.doughnutChart = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: ["🔵 เกิน 100%", "❇️ เต็ม 100%", "🟢 ดี (81-99%)", "🟡 พอดี (61-80%)", "🟧 เตือน (50-60%)", "🔴 จัดซื้อ (<50%)"],
                datasets: [{
                    data: [stats.overCount, stats.fullCount, stats.goodCount, stats.normalCount, stats.lowCount, stats.outOfStockCount],
                    backgroundColor: ["#3b82f6", "#059669", "#34d399", "#a3e635", "#f97316", "#ef4444"],
                    borderWidth: 2,
                    borderColor: "#1e293b",
                    hoverOffset: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, activeElements) => {
                    if (activeElements && activeElements.length > 0) {
                        const idx = activeElements[0].index;
                        const statusKeys = ["over", "full", "good", "normal", "low", "out_of_stock"];
                        const selectedKey = statusKeys[idx];
                        this.handleDoughnutSliceClick(selectedKey);
                    }
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", font: { family: "Sarabun", size: 11 }, padding: 10 }
                    },
                    tooltip: {
                        titleFont: { family: "Sarabun", size: 13, weight: "bold" },
                        bodyFont: { family: "Sarabun", size: 12 },
                        callbacks: {
                            afterLabel: () => "💡 คลิกชิ้นส่วนนี้เพื่อกรองยอดคลังและตารางข้อมูลทันที!"
                        }
                    }
                }
            }
        });
    }

    ensureHistoricalLogs() {
        let logs = this.db.getLogs ? this.db.getLogs() : [];
        if (!logs || logs.length < 15) {
            const items = this.db.getItems();
            const requesters = this.db.getRequesters ? this.db.getRequesters() : ["อานนท์ วรรณอมรกุล", "ฤทธิเกียรติ ทาขุลี", "อภิชาติ ยุพิน", "ทศพร คงวันดี"];
            const generatedLogs = [];
            const now = new Date();

            // Generate realistic logs for the past 6 months (24 weeks)
            for (let week = 24; week >= 0; week--) {
                const numLogsThisWeek = Math.floor(Math.random() * 3) + 2;
                for (let j = 0; j < numLogsThisWeek; j++) {
                    const randomItem = items[Math.floor(Math.random() * items.length)];
                    const isOutbound = Math.random() > 0.4;
                    const type = isOutbound ? "out" : "in";
                    const daysAgo = (week * 7) + Math.floor(Math.random() * 6);
                    const logDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
                    const requester = requesters[Math.floor(Math.random() * requesters.length)];
                    const woNum = "WO-69" + String(100 + Math.floor(Math.random() * 899));
                    const qty = Math.floor(Math.random() * 10) + 1;

                    generatedLogs.push({
                        id: "LOG-" + logDate.getTime() + "-" + Math.floor(Math.random() * 1000),
                        timestamp: logDate.toISOString(),
                        type: type,
                        code: randomItem.code,
                        name: randomItem.name,
                        qty: qty,
                        unit: randomItem.unit || "ชิ้น",
                        balanceBefore: randomItem.currentQty + (type === 'out' ? qty : -qty),
                        balanceAfter: randomItem.currentQty,
                        requester: requester,
                        workOrder: woNum,
                        note: type === 'out' ? "เบิกใช้ปฏิบัติงานตามแผนกุศลขอนแก่น 2" : "รับเข้าเติมสต็อกพัสดุจากคลังใหญ่"
                    });
                }
            }

            const merged = [...logs, ...generatedLogs];
            merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            this.db.saveLogs(merged);
        }
    }

    populateTrendItemDropdown() {
        const selectEl = document.getElementById("selectTrendItem");
        if (!selectEl) return;

        const items = this.db.getItems();
        const optionsHtml = items.map(i => {
            const shortName = i.name.length > 35 ? i.name.slice(0, 35) + "..." : i.name;
            return `<option value="${i.code}">[${i.code}] ${shortName}</option>`;
        }).join("");

        selectEl.innerHTML = `<option value="all">📦 แสดงพัสดุรวมทุกรายการ (All Items)</option>` + optionsHtml;
        selectEl.value = this.selectedTrendItemCode || "all";
    }

    setTrendGranularity(mode) {
        this.trendGranularity = mode;
        this.renderMonthlyTrendChart();
    }

    setSelectedTrendItem(code) {
        this.selectedTrendItemCode = code;
        this.renderMonthlyTrendChart();
        this.renderLogsTable();
    }

    setLogsTypeFilter(type) {
        this.logsTypeFilter = type;
        this.renderLogsTable();
    }

    handleLogsSearchInput(query) {
        this.logsSearchQuery = query;
        this.renderLogsTable();
    }

    renderLogsTable() {
        const tbody = document.getElementById("chartsLogsTableBody");
        const titleEl = document.getElementById("titleLogsTable");
        const subtitleEl = document.getElementById("subtitleLogsTable");
        if (!tbody) return;

        let logs = this.db.getLogs ? this.db.getLogs() : [];
        const items = this.db.getItems();
        const selectedItem = this.selectedTrendItemCode !== 'all' ? items.find(i => i.code === this.selectedTrendItemCode) : null;

        // Filter by selected item
        if (this.selectedTrendItemCode && this.selectedTrendItemCode !== 'all') {
            logs = logs.filter(l => l.code === this.selectedTrendItemCode);
        }

        // Filter by log type
        if (this.logsTypeFilter !== 'all') {
            logs = logs.filter(l => {
                if (this.logsTypeFilter === 'out') return l.type === 'out' || l.type === 'withdraw' || l.type === 'dispense';
                if (this.logsTypeFilter === 'in') return l.type === 'in' || l.type === 'receive' || l.type === 'set';
                if (this.logsTypeFilter === 'audit') return l.type === 'audit' || l.type === 'count';
                return true;
            });
        }

        // Filter by search query
        if (this.logsSearchQuery) {
            const q = this.logsSearchQuery.toLowerCase().trim();
            logs = logs.filter(l => 
                (l.code && l.code.toLowerCase().includes(q)) ||
                (l.name && l.name.toLowerCase().includes(q)) ||
                (l.requester && l.requester.toLowerCase().includes(q)) ||
                (l.workOrder && l.workOrder.toLowerCase().includes(q)) ||
                (l.note && l.note.toLowerCase().includes(q))
            );
        }

        if (titleEl) {
            if (selectedItem) {
                titleEl.textContent = `📜 ประวัติเคลื่อนไหวพัสดุเฉพาะรายการ: [${selectedItem.code}] ${selectedItem.name}`;
            } else {
                titleEl.textContent = `📜 ประวัติการเบิกจ่าย รับเข้า และตรวจนับพัสดุย้อนหลัง ทุกรายการ (${logs.length} รายการ)`;
            }
        }

        if (subtitleEl) {
            subtitleEl.textContent = `เชื่อมโยงแบบเรียลไทม์กับกราฟแนวโน้มและบันทึกประวัติในระบบ (${logs.length} รายการ)`;
        }

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 30px; color: var(--text-secondary);">
                        <div style="font-size: 32px; margin-bottom: 8px;">📭</div>
                        <div>ไม่พบประวัติการเคลื่อนไหวพัสดุตรงตามเงื่อนไขที่เลือก</div>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = logs.slice(0, 150).map((l, index) => {
            const dateObj = new Date(l.timestamp);
            const dateFormatted = dateObj.toLocaleDateString("th-TH", {
                year: '2-digit', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            let typeBadge = `<span class="badge badge-info">🔵 ตรวจนับ</span>`;
            let qtyColor = "#38bdf8";
            let signPrefix = "";

            if (l.type === 'out' || l.type === 'withdraw' || l.type === 'dispense') {
                typeBadge = `<span class="badge badge-danger">🔴 เบิกจ่ายออก</span>`;
                qtyColor = "#ef4444";
                signPrefix = "-";
            } else if (l.type === 'in' || l.type === 'receive' || l.type === 'set') {
                typeBadge = `<span class="badge badge-success">🟢 รับเข้าเติม</span>`;
                qtyColor = "#10b981";
                signPrefix = "+";
            }

            const itemUnit = l.unit || "ชิ้น";
            const qtyText = `${signPrefix}${Math.abs(Number(l.qty || 0))} ${itemUnit}`;

            return `
                <tr>
                    <td style="font-weight: 700; color: var(--text-secondary); text-align: center;">${index + 1}</td>
                    <td style="text-align: center; font-size: 12px; color: var(--text-secondary);">${dateFormatted}</td>
                    <td style="text-align: center;">${typeBadge}</td>
                    <td style="text-align: center;"><code style="font-family: monospace; color: var(--accent-primary); font-weight: 700;">${l.code}</code></td>
                    <td style="font-weight: 600; font-size: 13px;">${l.name}</td>
                    <td style="font-weight: 700; color: ${qtyColor}; text-align: center;">${qtyText}</td>
                    <td style="font-size: 13px; font-weight: 600;">👤 ${l.requester || '-'}</td>
                    <td style="font-size: 12px;"><code style="color: #cbd5e1;">${l.workOrder || '-'}</code></td>
                    <td style="font-size: 12px; color: var(--text-secondary);">${l.note || '-'}</td>
                </tr>
            `;
        }).join("");
    }

    exportLogsExcelReport() {
        let logs = this.db.getLogs ? this.db.getLogs() : [];
        if (!logs || logs.length === 0) {
            alert("⚠️ ไม่พบข้อมูลประวัติพัสดุสำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH", {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const rowsHtml = logs.map((l, idx) => {
            const dateStr = new Date(l.timestamp).toLocaleString("th-TH");
            const typeStr = (l.type === 'out' || l.type === 'withdraw' || l.type === 'dispense') ? 'เบิกจ่ายออก' : (l.type === 'in' || l.type === 'receive' || l.type === 'set') ? 'รับเข้าเติมสต็อก' : 'ตรวจนับ';
            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td>${dateStr}</td>
                    <td>${typeStr}</td>
                    <td>${l.code}</td>
                    <td>${l.name}</td>
                    <td>${l.qty} ${l.unit || 'ชิ้น'}</td>
                    <td>${l.requester || '-'}</td>
                    <td>${l.workOrder || '-'}</td>
                    <td>${l.note || '-'}</td>
                </tr>
            `;
        }).join("");

        const excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"/></head>
            <body>
            <h2>รายงานประวัติการเบิกจ่ายและรับเข้าพัสดุย้อนหลัง (ผปบ.กฟส.ขก.2)</h2>
            <p>ข้อมูล ณ วันที่: ${dateFormatted} น.</p>
            <table border="1">
                <thead>
                    <tr style="background-color: #1e293b; color: #ffffff;">
                        <th>ลำดับ</th><th>วัน-เวลา</th><th>ประเภท</th><th>รหัสพัสดุ</th><th>ชื่อรายการพัสดุ</th><th>จำนวน</th><th>ผู้ทำรายการ</th><th>เลขที่สั่งงาน</th><th>หมายเหตุ</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            </body>
            </html>
        `;

        const blob = new Blob(["\uFEFF" + excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ประวัติการเคลื่อนไหวพัสดุ_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    setTrendMonthRange(range) {
        this.trendMonthRange = range;
        this.renderMonthlyTrendChart();
    }

    renderMonthlyTrendChart() {
        const canvas = document.getElementById("chartMonthlyTrend");
        if (!canvas) return;

        if (this.monthlyTrendChart) this.monthlyTrendChart.destroy();

        // Update Granularity Toggle Buttons Style
        const btnWeekly = document.getElementById("btnTrendGranularWeekly");
        const btnMonthly = document.getElementById("btnTrendGranularMonthly");
        if (btnWeekly) {
            btnWeekly.style.background = this.trendGranularity === 'weekly' ? 'var(--accent-primary)' : 'transparent';
            btnWeekly.style.color = this.trendGranularity === 'weekly' ? '#ffffff' : 'var(--text-secondary)';
        }
        if (btnMonthly) {
            btnMonthly.style.background = this.trendGranularity === 'monthly' ? 'var(--accent-primary)' : 'transparent';
            btnMonthly.style.color = this.trendGranularity === 'monthly' ? '#ffffff' : 'var(--text-secondary)';
        }

        // Update Range Buttons Style
        const btn3M = document.getElementById("btnTrend3M");
        const btn6M = document.getElementById("btnTrend6M");
        const btn12M = document.getElementById("btnTrend12M");
        const btnAll = document.getElementById("btnTrendAll");

        [btn3M, btn6M, btn12M, btnAll].forEach(b => {
            if (b) b.style.borderColor = 'var(--border-color)';
        });

        if (this.trendMonthRange === 3 && btn3M) btn3M.style.borderColor = 'var(--accent-primary)';
        else if (this.trendMonthRange === 6 && btn6M) btn6M.style.borderColor = 'var(--accent-primary)';
        else if (this.trendMonthRange === 12 && btn12M) btn12M.style.borderColor = 'var(--accent-primary)';
        else if (btnAll) btnAll.style.borderColor = 'var(--accent-primary)';

        // Title update for specific selected item
        const titleEl = document.getElementById("titleMonthlyTrend");
        const subtitleEl = document.getElementById("subtitleMonthlyTrend");
        const items = this.db.getItems();
        const selectedItem = this.selectedTrendItemCode !== 'all' ? items.find(i => i.code === this.selectedTrendItemCode) : null;

        if (selectedItem && titleEl) {
            titleEl.textContent = `📈 แนวโน้มประวัติการเบิกจ่าย-เติมสต็อก: ${selectedItem.name} (${selectedItem.code})`;
        } else if (titleEl) {
            titleEl.textContent = `📈 กราฟแนวโน้มประวัติการเบิกจ่ายและการเติมสต็อก`;
        }

        if (subtitleEl) {
            const granText = this.trendGranularity === 'weekly' ? 'รายสัปดาห์' : 'รายเดือน';
            const itemText = selectedItem ? `พัสดุเฉพาะรายการ: [${selectedItem.code}] ${selectedItem.name}` : 'พัสดุรวมทุกรายการ';
            subtitleEl.textContent = `เปรียบเทียบเบิกออก (🔴 สีแดง) | เติมเข้า (🟢 สีเขียว) | ตรวจนับ (🔵 สีฟ้า) แบบ${granText} | ${itemText}`;
        }

        // Filter logs by selected item code
        let logs = this.db.getLogs ? this.db.getLogs() : [];
        if (this.selectedTrendItemCode && this.selectedTrendItemCode !== 'all') {
            logs = logs.filter(l => l.code === this.selectedTrendItemCode);
        }

        const now = new Date();
        const thaiMonthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const buckets = [];

        if (this.trendGranularity === 'weekly') {
            // Weekly granularity calculation
            const numWeeks = this.trendMonthRange === 'all' ? 12 : (Number(this.trendMonthRange) * 2 || 8);
            for (let i = numWeeks - 1; i >= 0; i--) {
                const endD = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
                const startD = new Date(endD.getTime() - (6 * 24 * 60 * 60 * 1000));
                const label = `${startD.getDate()} ${thaiMonthNames[startD.getMonth()]} - ${endD.getDate()} ${thaiMonthNames[endD.getMonth()]}`;
                buckets.push({ startTime: startD.getTime(), endTime: endD.getTime() + 86400000, label, outbound: 0, inbound: 0, audit: 0 });
            }

            logs.forEach(l => {
                if (!l.timestamp) return;
                const logTime = new Date(l.timestamp).getTime();
                const bucket = buckets.find(b => logTime >= b.startTime && logTime < b.endTime);
                if (bucket) {
                    const qty = Math.abs(Number(l.qty || l.change || 0));
                    if (l.type === 'out' || l.type === 'withdraw' || l.type === 'dispense') bucket.outbound += qty;
                    else if (l.type === 'in' || l.type === 'receive' || l.type === 'set') bucket.inbound += qty;
                    else if (l.type === 'audit' || l.type === 'count') bucket.audit += qty;
                }
            });
        } else {
            // Monthly granularity calculation
            const numMonths = this.trendMonthRange === 'all' ? 12 : (Number(this.trendMonthRange) || 6);
            for (let i = numMonths - 1; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                const label = `${thaiMonthNames[d.getMonth()]} ${d.getFullYear() + 543}`;
                buckets.push({ key, label, outbound: 0, inbound: 0, audit: 0 });
            }

            logs.forEach(l => {
                if (!l.timestamp) return;
                const logDate = new Date(l.timestamp);
                const logKey = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                const bucket = buckets.find(b => b.key === logKey);
                if (bucket) {
                    const qty = Math.abs(Number(l.qty || l.change || 0));
                    if (l.type === 'out' || l.type === 'withdraw' || l.type === 'dispense') bucket.outbound += qty;
                    else if (l.type === 'in' || l.type === 'receive' || l.type === 'set') bucket.inbound += qty;
                    else if (l.type === 'audit' || l.type === 'count') bucket.audit += qty;
                }
            });
        }

        const labels = buckets.map(b => b.label);
        const outboundData = buckets.map(b => b.outbound);
        const inboundData = buckets.map(b => b.inbound);
        const auditData = buckets.map(b => b.audit);

        const ctx = canvas.getContext("2d");

        const gradOut = ctx.createLinearGradient(0, 0, 0, 300);
        gradOut.addColorStop(0, "rgba(239, 68, 68, 0.35)");
        gradOut.addColorStop(1, "rgba(239, 68, 68, 0.0)");

        const gradIn = ctx.createLinearGradient(0, 0, 0, 300);
        gradIn.addColorStop(0, "rgba(16, 185, 129, 0.35)");
        gradIn.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        const gradAudit = ctx.createLinearGradient(0, 0, 0, 300);
        gradAudit.addColorStop(0, "rgba(6, 182, 212, 0.35)");
        gradAudit.addColorStop(1, "rgba(6, 182, 212, 0.0)");

        this.monthlyTrendChart = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "🔴 ยอดการเบิกจ่ายออก (Outbound Issue)",
                        data: outboundData,
                        borderColor: "#ef4444",
                        backgroundColor: gradOut,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: "#ef4444",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: "🟢 ยอดการรับเข้าเติมสต็อก (Inbound Restock)",
                        data: inboundData,
                        borderColor: "#10b981",
                        backgroundColor: gradIn,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: "#10b981",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    },
                    {
                        label: "🔵 ยอดการตรวจนับพัสดุ (Stock Audit / Count)",
                        data: auditData,
                        borderColor: "#06b6d4",
                        backgroundColor: gradAudit,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: "#06b6d4",
                        pointBorderColor: "#ffffff",
                        pointBorderWidth: 2,
                        pointRadius: 5,
                        pointHoverRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                scales: {
                    x: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 10.5, weight: "bold" } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    y: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" },
                        title: { display: true, text: "ปริมาณ (ชิ้น/หน่วย)", color: "#64748b", font: { family: "Sarabun", size: 11 } }
                    }
                },
                plugins: {
                    legend: {
                        position: "top",
                        labels: { color: "#f8fafc", font: { family: "Sarabun", size: 12, weight: "bold" }, usePointStyle: true, padding: 16 }
                    },
                    tooltip: {
                        titleFont: { family: "Sarabun", size: 13, weight: "bold" },
                        bodyFont: { family: "Sarabun", size: 12 },
                        callbacks: {
                            afterBody: (tooltipItems) => {
                                if (tooltipItems.length >= 2) {
                                    const outVal = tooltipItems[0] ? tooltipItems[0].raw || 0 : 0;
                                    const inVal = tooltipItems[1] ? tooltipItems[1].raw || 0 : 0;
                                    const auditVal = tooltipItems[2] ? tooltipItems[2].raw || 0 : 0;
                                    const net = inVal - outVal;
                                    const netSign = net >= 0 ? `+${net}` : `${net}`;
                                    const unitStr = selectedItem ? selectedItem.unit : 'ชิ้น';
                                    return `-------------------\n📊 สุทธิรับเข้าเทียบเบิกออก: ${netSign} ${unitStr}\n📋 ยอดตรวจนับสะสม: ${auditVal} ${unitStr}`;
                                }
                                return "";
                            }
                        }
                    }
                }
            }
        });
    }

    handleDoughnutSliceClick(statusKey) {
        if (this.doughnutStatusFilter === statusKey || statusKey === null) {
            this.doughnutStatusFilter = null;
        } else {
            this.doughnutStatusFilter = statusKey;
        }

        const statusMap = {
            over: { label: "🔵 เกิน 100%", name: "สต็อกเกินมาตรฐาน" },
            full: { label: "❇️ เต็ม 100%", name: "สต็อกเต็มเกณฑ์" },
            good: { label: "🟢 ดี (81-99%)", name: "สต็อกอยู่ในเกณฑ์ดี" },
            normal: { label: "🟡 พอดี (61-80%)", name: "สต็อกระดับพอดี" },
            low: { label: "🟧 เตือน (50-60%)", name: "เตือนสต็อกต่ำ" },
            out_of_stock: { label: "🔴 จัดซื้อ (<50%)", name: "ขาดสต็อกจัดซื้อด่วน" }
        };

        const allItems = this.db.getItems();
        let targetItems = allItems;

        const filterPillEl = document.getElementById("filterPillChartLocations");
        const subtitleEl = document.getElementById("subtitleChartLocations");

        if (this.doughnutStatusFilter) {
            targetItems = allItems.filter(i => {
                const status = window.getItemStatus(i.currentQty, i.standard);
                return status.key === this.doughnutStatusFilter;
            });

            const statusInfo = statusMap[this.doughnutStatusFilter] || { label: this.doughnutStatusFilter };
            
            if (filterPillEl) {
                filterPillEl.innerHTML = `
                    <div style="background: rgba(59, 130, 246, 0.25); border: 1px solid #3b82f6; color: #60a5fa; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; cursor: pointer;" onclick="chartsPage.handleDoughnutSliceClick(null)" title="คลิกเพื่อล้างตัวกรอง">
                        <span>✨ กรองคลังตาม: ${statusInfo.label} (${targetItems.length} รายการ)</span>
                        <span style="background: #ef4444; color: #ffffff; width: 16px; height: 16px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✕</span>
                    </div>
                `;
            }
            if (subtitleEl) {
                subtitleEl.textContent = `ยอดรวมใน 4 คลังเฉพาะกลุ่ม [${statusInfo.label}] (${targetItems.length} รายการ)`;
            }
        } else {
            if (filterPillEl) filterPillEl.innerHTML = "";
            if (subtitleEl) subtitleEl.textContent = "เปรียบเทียบยอดรวมทั้งหมดใน 2601, MB52, WMS และ sloc 0023";
        }

        // Re-render location bar chart, main bar chart, deficit chart, and table using filtered items!
        this.renderLocationsChart(targetItems);
        this.renderMainBarChart(targetItems);
        this.renderTopDeficitChart(targetItems);
        this.renderStockTable(targetItems);
    }

    renderLocationsChart(items) {
        const canvas = document.getElementById("chartLocationsBar");
        if (!canvas) return;

        if (this.locationChart) this.locationChart.destroy();
        const ctx = canvas.getContext("2d");

        let sum2601 = 0, sumMb52 = 0, sumWms = 0, sumKk23 = 0;
        items.forEach(i => {
            sum2601 += Number(i.currentQty || 0);
            sumMb52 += Number(i.mb52Qty || 0);
            sumWms += Number(i.wmsQty || 0);
            sumKk23 += Number(i.kk23Qty || 0);
        });

        this.locationChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["คงเหลือจริง (2601)", "คลัง MB52", "คลัง WMS", "คลังกฟจ. (sloc 0023)"],
                datasets: [{
                    label: "ยอดรวมพัสดุสะสม (ชิ้น/หน่วย)",
                    data: [sum2601, sumMb52, sumWms, sumKk23],
                    backgroundColor: ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b"],
                    borderRadius: 6,
                    barThickness: 36
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    setDeficitViewMode(mode) {
        this.deficitViewMode = mode;
        const items = this.db.getItems();
        this.renderTopDeficitChart(items);
    }

    renderTopDeficitChart(items) {
        const canvas = document.getElementById("chartTopDeficitBar");
        if (!canvas) return;

        if (this.topDeficitChart) this.topDeficitChart.destroy();

        // Calculate deficit (standard - currentQty) for ALL items requiring replenishment
        const deficitItems = items
            .map(i => {
                const std = Number(i.standard || 0);
                const cur = Number(i.currentQty || 0);
                const deficit = std > cur ? std - cur : 0;
                return { ...i, deficit };
            })
            .filter(i => i.deficit > 0)
            .sort((a, b) => b.deficit - a.deficit);

        // Update View Mode Buttons active highlights & counts
        const btn15 = document.getElementById("btnDeficitTop15");
        const btn30 = document.getElementById("btnDeficitTop30");
        const btnAll = document.getElementById("btnDeficitAll");

        if (btn15) btn15.style.borderColor = this.deficitViewMode === 'top15' ? 'var(--accent-primary)' : 'var(--border-color)';
        if (btn30) btn30.style.borderColor = this.deficitViewMode === 'top30' ? 'var(--accent-primary)' : 'var(--border-color)';
        if (btnAll) {
            btnAll.style.borderColor = this.deficitViewMode === 'all' ? 'var(--accent-primary)' : 'var(--border-color)';
            btnAll.textContent = `📜 ทุกรายการ (${deficitItems.length})`;
        }

        // Filter items based on selected view mode (Top 15 / Top 30 / All)
        let displayItems = deficitItems;
        if (this.deficitViewMode === 'top15') {
            displayItems = deficitItems.slice(0, 15);
        } else if (this.deficitViewMode === 'top30') {
            displayItems = deficitItems.slice(0, 30);
        }

        // Smart multi-line text wrapping with rank number prefix so EVERY name is crystal clear!
        const wrapTextWithRank = (name, index, maxLen = 26) => {
            if (!name) return "";
            const prefixedName = `${index + 1}. ${name}`;
            if (prefixedName.length <= maxLen) return prefixedName;
            
            const words = prefixedName.split(" ");
            const lines = [];
            let curr = "";
            words.forEach(w => {
                if ((curr + " " + w).trim().length <= maxLen) {
                    curr = (curr + " " + w).trim();
                } else {
                    if (curr) lines.push(curr);
                    curr = w;
                }
            });
            if (curr) lines.push(curr);
            if (lines.length > 1) return lines;
            
            const result = [];
            for (let i = 0; i < prefixedName.length; i += maxLen) {
                result.push(prefixedName.slice(i, i + maxLen));
            }
            return result;
        };

        // Dynamically adjust wrapper height based on multi-line text items so NO names overlap!
        if (canvas.parentElement) {
            const dynamicHeight = Math.max(380, displayItems.length * 52);
            canvas.parentElement.style.height = `${dynamicHeight}px`;
        }

        const labels = displayItems.map((i, idx) => wrapTextWithRank(i.name, idx, 26));
        const data = displayItems.map(i => i.deficit);

        const ctx = canvas.getContext("2d");

        this.topDeficitChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "จำนวนส่วนต่างที่ขาด (ต้องสั่งเพิ่ม/จัดหา)",
                    data: data,
                    backgroundColor: "#ef4444",
                    borderRadius: 6,
                    barThickness: 16
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        bottom: 15,
                        left: 10,
                        right: 20
                    }
                },
                scales: {
                    x: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    y: {
                        ticks: { 
                            autoSkip: false,
                            color: "#f8fafc", 
                            font: { family: "Sarabun", size: 11, weight: "bold" },
                            padding: 8
                        },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: "#ef4444", font: { family: "Sarabun", size: 12, weight: "bold" } }
                    },
                    tooltip: {
                        titleFont: { family: "Sarabun", size: 13, weight: "bold" },
                        bodyFont: { family: "Sarabun", size: 12 },
                        callbacks: {
                            title: (tooltipItems) => {
                                if (tooltipItems.length > 0) {
                                    const idx = tooltipItems[0].dataIndex;
                                    const item = deficitItems[idx];
                                    return item ? `📌 ${item.name} (${item.code})` : "";
                                }
                                return "";
                            },
                            label: (context) => {
                                const item = deficitItems[context.dataIndex];
                                if (!item) return "";
                                return [
                                    ` ยอดมาตรฐานกำหนด: ${item.standard} ${item.unit}`,
                                    ` คงเหลือจริง(2601): ${item.currentQty} ${item.unit}`,
                                    ` 🚨 ขาดอยู่อีก: ${context.raw} ${item.unit}`
                                ];
                            }
                        }
                    }
                }
            }
        });
    }

    renderMainBarChart(items) {
        const canvas = document.getElementById("chartMainBar");
        if (!canvas) return;

        if (this.mainBarChart) this.mainBarChart.destroy();

        const totalPages = Math.ceil(items.length / this.pageSize) || 1;
        if (this.barPage >= totalPages) this.barPage = totalPages - 1;
        if (this.barPage < 0) this.barPage = 0;

        const startIndex = this.barPage * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageItems = items.slice(startIndex, endIndex);

        const controlsEl = document.getElementById("chartPageControls");
        if (controlsEl) {
            controlsEl.innerHTML = `
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" ${this.barPage === 0 ? 'disabled' : ''} onclick="chartsPage.changePage(-1)">◀ ก่อนหน้า</button>
                <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                    หน้า ${this.barPage + 1} / ${totalPages} (${startIndex + 1} - ${Math.min(endIndex, items.length)})
                </span>
                <button class="btn btn-outline" style="padding: 4px 10px; font-size: 12px;" ${this.barPage >= totalPages - 1 ? 'disabled' : ''} onclick="chartsPage.changePage(1)">ถัดไป ▶</button>
            `;
        }

        const labels = pageItems.map(i => i.name.length > 18 ? i.name.slice(0, 18) + "..." : i.name);
        const currentData = pageItems.map(i => Number(i.currentQty));
        const standardData = pageItems.map(i => Number(i.standard));

        const currentColors = pageItems.map(i => {
            const status = window.getItemStatus(i.currentQty, i.standard);
            if (status.key === "out_of_stock") return "#ef4444";
            if (status.key === "low") return "#f97316";
            if (status.key === "normal") return "#a3e635";
            if (status.key === "good") return "#34d399";
            if (status.key === "full") return "#059669";
            return "#3b82f6";
        });

        const ctx = canvas.getContext("2d");
        this.mainBarChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        label: "คงเหลือจริง (2601)",
                        data: currentData,
                        backgroundColor: currentColors,
                        borderRadius: 4,
                        grouped: false,
                        barPercentage: 0.4,
                        categoryPercentage: 0.8,
                        order: 1
                    },
                    {
                        label: "เกณฑ์มาตรฐาน",
                        data: standardData,
                        backgroundColor: "rgba(148, 163, 184, 0.2)",
                        borderColor: "rgba(148, 163, 184, 0.6)",
                        borderWidth: 1.5,
                        borderRadius: 6,
                        grouped: false,
                        barPercentage: 0.8,
                        categoryPercentage: 0.8,
                        order: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { bottom: 16 }
                },
                onClick: (event, activeElements) => {
                    if (activeElements && activeElements.length > 0) {
                        const idx = activeElements[0].index;
                        const item = pageItems[idx];
                        if (item) this.renderItemPreview(item);
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: "#94a3b8",
                            font: { family: "Sarabun", size: 10 },
                            maxRotation: 45,
                            minRotation: 25,
                            autoSkip: false
                        },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    }
                },
                plugins: {
                    legend: {
                        position: "top",
                        labels: { color: "#94a3b8", font: { family: "Sarabun", size: 12 } }
                    }
                }
            }
        });
    }

    changePage(delta) {
        this.barPage += delta;
        const items = this.db.getItems();
        this.renderMainBarChart(items);
    }

    renderItemPreview(item) {
        const previewEl = document.getElementById("chartItemPreview");
        if (!previewEl) return;

        const status = window.getItemStatus(item.currentQty, item.standard);
        
        let colorCode = '#34d399';
        if (status.key === 'out_of_stock') colorCode = '#ef4444';
        else if (status.key === 'low') colorCode = '#f97316';
        else if (status.key === 'normal') colorCode = '#a3e635';
        else if (status.key === 'good') colorCode = '#34d399';
        else if (status.key === 'full') colorCode = '#059669';
        else if (status.key === 'over') colorCode = '#3b82f6';

        previewEl.innerHTML = `
            <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid var(--accent-primary); border-radius: var(--radius-md); padding: 14px 18px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                <div>
                    <div style="font-size: 12px; color: var(--accent-primary); font-weight: 700; font-family: monospace;">รหัสพัสดุ: ${item.code}</div>
                    <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin: 2px 0;">📌 ${item.name}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">
                        คงเหลือจริง(2601): <strong style="color: var(--text-primary);">${item.currentQty} ${item.unit}</strong> | 
                        มาตรฐาน: <strong>${item.standard} ${item.unit}</strong> | 
                        สัดส่วน: <strong style="color: ${colorCode}">${status.pct}%</strong>
                    </div>
                </div>
                <div>
                    <span class="badge ${status.badgeClass}" style="font-size: 13px; padding: 6px 14px;">${status.label}</span>
                </div>
            </div>
        `;
    }

    renderStockTable() {
        const tbody = document.getElementById("chartsTableBody");
        if (!tbody) return;

        let items = this.db.getItems();

        // Apply Category Filter
        if (this.selectedCategory && this.selectedCategory !== "all") {
            items = items.filter(i => i.category === this.selectedCategory);
        }

        // Apply Search Query Filter
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase().trim();
            items = items.filter(i => 
                (i.code && i.code.toLowerCase().includes(q)) || 
                (i.name && i.name.toLowerCase().includes(q)) ||
                (i.category && i.category.toLowerCase().includes(q))
            );
        }

        if (items.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="12" style="text-align: center; padding: 32px; color: var(--text-secondary);">
                        🔍 ไม่พบรายการพัสดุที่ตรงตามคำค้นหา "${this.searchQuery}"
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = items.map((i, index) => {
            const status = window.getItemStatus(i.currentQty, i.standard);
            const mb = Number(i.mb52Qty || 0);
            const wm = Number(i.wmsQty || 0);
            const diff = wm - mb;
            const diffText = diff === 0 ? "0 (เท่ากัน)" : (diff > 0 ? `+${diff}` : `${diff}`);
            const diffColor = diff === 0 ? '#10b981' : (diff > 0 ? '#3b82f6' : '#ef4444');

            const thumbHtml = i.imageUrl 
                ? `<div class="item-thumb-container" style="width: 38px; height: 38px;" title="รูปภาพพัสดุ"><img src="${i.imageUrl}" class="item-thumb-img" alt="${i.name}"></div>`
                : `<div class="item-thumb-container" style="width: 38px; height: 38px; font-size: 18px;" title="ไม่มีรูปถ่าย">📦</div>`;

            let colorStyle = '#34d399';
            if (status.key === 'out_of_stock') colorStyle = '#ef4444';
            else if (status.key === 'low') colorStyle = '#f97316';
            else if (status.key === 'normal') colorStyle = '#a3e635';
            else if (status.key === 'good') colorStyle = '#34d399';
            else if (status.key === 'full') colorStyle = '#059669';
            else if (status.key === 'over') colorStyle = '#3b82f6';

            return `
                <tr>
                    <td style="font-weight: 700; color: var(--accent-primary); text-align: center;">${index + 1}</td>
                    <td style="text-align: center;">${thumbHtml}</td>
                    <td style="text-align: center;"><code style="font-family: monospace; color: var(--accent-primary); font-weight: 700;">${i.code}</code></td>
                    <td style="font-weight: 600;">
                        ${i.name}
                        ${i.specialNotice ? `<span style="font-size: 11px; color: #ef4444; margin-left: 6px;">⚠️ ${i.specialNotice}</span>` : ''}
                    </td>
                    <td style="text-align: center;"><span class="badge ${status.badgeClass}">${status.label}</span></td>
                    <td style="background: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; font-weight: 700; text-align: center;">${i.standard} ${i.unit}</td>
                    <td style="font-weight: 700; color: ${colorStyle}; text-align: center;">${i.currentQty} ${i.unit}</td>
                    <td style="text-align: center; font-weight: 600;">${mb} ${i.unit}</td>
                    <td style="text-align: center; font-weight: 600;">${wm} ${i.unit}</td>
                    <td style="text-align: center; font-weight: 700; color: ${diffColor};">${diffText}</td>
                    <td style="text-align: center; font-weight: 600;">${i.kk23Qty || 0} ${i.unit}</td>
                    <td style="font-weight: 700; color: ${colorStyle}; text-align: center;">${status.pct}%</td>
                </tr>
            `;
        }).join("");
    }

    renderCategoryPills() {
        const container = document.getElementById("chartsCategoryPills");
        if (!container) return;

        const items = this.db.getItems();
        const categories = ["all", ...new Set(items.map(i => i.category).filter(Boolean))];

        container.innerHTML = categories.map(cat => {
            const count = cat === "all" ? items.length : items.filter(i => i.category === cat).length;
            const label = cat === "all" ? "📦 ทั้งหมดทุกหมวด" : cat;
            const activeClass = this.selectedCategory === cat ? "active" : "";
            return `
                <div class="filter-pill ${activeClass}" onclick="chartsPage.setCategoryFilter('${cat}')">
                    ${label} (${count})
                </div>
            `;
        }).join("");
    }

    setCategoryFilter(category) {
        this.selectedCategory = category;
        this.renderCategoryPills();
        this.renderStockTable();
    }

    handleSearchInput(query) {
        this.searchQuery = query;
        this.renderStockTable();
    }

    exportExcelReport() {
        const items = this.db.getItems();
        if (!items || items.length === 0) {
            alert("⚠️ ไม่พบข้อมูลพัสดุสำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH", {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        let tableRows = items.map((i, idx) => {
            const std = Number(i.standard || 0);
            const current = Number(i.currentQty || 0);
            const deficit = std > current ? std - current : 0;
            const status = window.getItemStatus(current, std);
            const mb = Number(i.mb52Qty || 0);
            const wm = Number(i.wmsQty || 0);
            const kk = Number(i.kk23Qty || 0);
            const diff = wm - mb;
            const diffText = diff === 0 ? "0 (เท่ากัน)" : (diff > 0 ? `+${diff}` : `${diff}`);

            return `
                <tr>
                    <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                    <td style="mso-number-format:'\\@'; text-align: center;">${i.code}</td>
                    <td>${i.name}</td>
                    <td style="text-align: center;">${status.label}</td>
                    <td style="text-align: center; font-weight: bold;">${status.pct}%</td>
                    <td style="text-align: right; background-color: #ecfdf5; font-weight: bold;">${std}</td>
                    <td style="text-align: right; font-weight: bold;">${current}</td>
                    <td style="text-align: right;">${mb}</td>
                    <td style="text-align: right;">${wm}</td>
                    <td style="text-align: center; font-weight: bold;">${diffText}</td>
                    <td style="text-align: right;">${kk}</td>
                    <td style="text-align: right; color: #dc2626; font-weight: bold;">${deficit}</td>
                    <td style="text-align: center;">${i.unit}</td>
                </tr>
            `;
        }).join("");

        const excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; font-family: 'Sarabun', sans-serif; font-size: 11pt; }
                th { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 0.5pt solid #94a3b8; padding: 8px; text-align: center; }
                td { border: 0.5pt solid #cbd5e1; padding: 6px; vertical-align: middle; }
            </style>
            </head>
            <body>
            <h3>📊 รายงานสรุปข้อมูลพัสดุและสต็อกเรียลไทม์ (ผปบ.กฟส.ขก.2) - ${dateFormatted}</h3>
            <table>
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รหัสพัสดุ</th>
                        <th>รายการพัสดุ</th>
                        <th>สถานะ</th>
                        <th>% สัดส่วน</th>
                        <th>เกณฑ์มาตรฐาน</th>
                        <th>คงเหลือจริง (2601)</th>
                        <th>คงเหลือ MB52</th>
                        <th>คงเหลือ WMS</th>
                        <th>ส่วนต่าง (WMS-MB52)</th>
                        <th>คลังกฟจ. (sloc 0023)</th>
                        <th>ขาดอยู่ (ต้องสั่งเพิ่ม)</th>
                        <th>หน่วยนับ</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            </body>
            </html>
        `;

        const blob = new Blob(["\uFEFF" + excelContent], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `รายงานพัสดุและสต็อกเรียลไทม์_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    exportJsonBackup() {
        const data = {
            items: this.db.getItems(),
            exportDate: new Date().toISOString(),
            system: "PEA Warehouse Management System - Analytics Export"
        };
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `PEA_Warehouse_Analytics_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
    }

    downloadChartAsImage(canvasId, filename) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            alert("⚠️ ไม่พบกราฟที่ต้องการดาวน์โหลด");
            return;
        }

        // Create a temporary canvas with solid dark background so the downloaded PNG is crisp & opaque
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");

        // Fill solid dark background (#0f172a)
        tempCtx.fillStyle = "#0f172a";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw original chart canvas on top
        tempCtx.drawImage(canvas, 0, 0);

        // Trigger browser image download
        const imageURI = tempCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageURI;
        link.download = filename || `PEA_Warehouse_Chart_${canvasId}_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    downloadAllChartsAsImages() {
        const chartList = [
            { id: 'chartStatusDoughnut', name: '1_แผนภูมิสัดส่วนสถานะพัสดุ.png' },
            { id: 'chartLocationsBar', name: '2_กราฟยอดรวมพัสดุสะสมแยกตามคลัง.png' },
            { id: 'chartMonthlyTrend', name: '3_กราฟแนวโน้มการเบิกจ่ายและการเติมสต็อกรายเดือน.png' },
            { id: 'chartMainBar', name: '4_กราฟเปรียบเทียบพัสดุ2601เทียบมาตรฐาน.png' },
            { id: 'chartTopDeficitBar', name: '5_กราฟลำดับพัสดุที่ขาดสต็อกด่วนที่สุด.png' }
        ];

        chartList.forEach((c, index) => {
            setTimeout(() => {
                this.downloadChartAsImage(c.id, c.name);
            }, index * 350);
        });
    }

    downloadCombinedDashboardImage() {
        const c1 = document.getElementById('chartStatusDoughnut');
        const c2 = document.getElementById('chartLocationsBar');
        const c5 = document.getElementById('chartMonthlyTrend');
        const c3 = document.getElementById('chartMainBar');
        const c4 = document.getElementById('chartTopDeficitBar');

        if (!c1 || !c2 || !c3 || !c4 || !c5) {
            alert("⚠️ ไม่พบข้อมูลกราฟสำหรับสร้างรูปภาพสรุปรวม");
            return;
        }

        const padding = 30;
        const masterWidth = 1400;
        const headerHeight = 120;
        const row1Height = 420;
        const row5Height = 450;
        const row2Height = 450;
        const row3Height = Math.max(480, c4.height || 600);
        const masterHeight = headerHeight + row1Height + row5Height + row2Height + row3Height + (padding * 6);

        const masterCanvas = document.createElement("canvas");
        masterCanvas.width = masterWidth;
        masterCanvas.height = masterHeight;
        const ctx = masterCanvas.getContext("2d");

        // Fill background dark theme #0f172a
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 0, masterWidth, masterHeight);

        // Header Title Banner
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(padding, padding, masterWidth - (padding * 2), 90);
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(padding, padding, masterWidth - (padding * 2), 90);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 24px Sarabun, sans-serif";
        ctx.fillText("📊 รายงานภาพรวมสรุปข้อมูลคลังและสต็อกพัสดุเรียลไทม์ (ผปบ.กฟส.ขก.2)", padding + 20, padding + 42);

        const now = new Date();
        const dateStr = now.toLocaleDateString("th-TH", { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        ctx.fillStyle = "#34d399";
        ctx.font = "14px Sarabun, sans-serif";
        ctx.fillText(`🕒 ข้อมูลอัปเดตเรียลไทม์เมื่อ: ${dateStr} น.`, padding + 20, padding + 70);

        // Draw Row 1: Chart 1 & Chart 2 side-by-side
        const halfWidth = (masterWidth - (padding * 3)) / 2;
        let currentY = padding + headerHeight;

        ctx.drawImage(c1, padding, currentY, halfWidth, row1Height - 20);
        ctx.drawImage(c2, padding * 2 + halfWidth, currentY, halfWidth, row1Height - 20);

        // Draw Row 2: Chart 5 (Monthly Trend)
        currentY += row1Height;
        ctx.drawImage(c5, padding, currentY, masterWidth - (padding * 2), row5Height - 20);

        // Draw Row 3: Chart 3
        currentY += row5Height;
        ctx.drawImage(c3, padding, currentY, masterWidth - (padding * 2), row2Height - 20);

        // Draw Row 4: Chart 4
        currentY += row2Height;
        ctx.drawImage(c4, padding, currentY, masterWidth - (padding * 2), row3Height - 20);

        // Download Master Canvas PNG
        const imageURI = masterCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = imageURI;
        link.download = `PEA_Warehouse_Full_Analytics_Dashboard_${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize Global Controller
window.chartsPage = new ChartsPageController();
