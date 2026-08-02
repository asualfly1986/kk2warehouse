/**
 * PEA Warehouse Analytics - Dedicated Charts Page Controller
 * Handles chart initialization, real-time data sync, and interactive visual rendering
 */
class ChartsPageController {
    constructor() {
        this.db = window.db || new StockDatabase();
        this.barPage = 0;
        this.pageSize = 20;

        // Chart instances
        this.doughnutChart = null;
        this.locationChart = null;
        this.topDeficitChart = null;
        this.mainBarChart = null;

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            await this.db.loadFromCloudD1();
        } catch (err) {
            console.warn("Cloud D1 sync fallback to local storage:", err);
        }
        this.renderKpis();
        this.renderAllCharts();
    }

    async refreshAllCharts() {
        try {
            await this.db.loadFromCloudD1();
        } catch (err) {}
        this.renderKpis();
        this.renderAllCharts();
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
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { color: "#94a3b8", font: { family: "Sarabun", size: 11 }, padding: 10 }
                    }
                }
            }
        });
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

    renderTopDeficitChart(items) {
        const canvas = document.getElementById("chartTopDeficitBar");
        if (!canvas) return;

        if (this.topDeficitChart) this.topDeficitChart.destroy();

        // Calculate deficit (standard - currentQty) and take top 10
        const deficitItems = items
            .map(i => {
                const std = Number(i.standard || 0);
                const cur = Number(i.currentQty || 0);
                const deficit = std > cur ? std - cur : 0;
                return { ...i, deficit };
            })
            .filter(i => i.deficit > 0)
            .sort((a, b) => b.deficit - a.deficit)
            .slice(0, 10);

        const labels = deficitItems.map(i => i.name.length > 22 ? i.name.slice(0, 22) + "..." : i.name);
        const data = deficitItems.map(i => i.deficit);

        const ctx = canvas.getContext("2d");

        this.topDeficitChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "จำนวนที่ขาดและต้องสั่งเพิ่ม (Deficit Qty)",
                    data: data,
                    backgroundColor: "#ef4444",
                    borderRadius: 6,
                    barThickness: 18
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { color: "rgba(255, 255, 255, 0.05)" }
                    },
                    y: {
                        ticks: { color: "#94a3b8", font: { family: "Sarabun", size: 11 } },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: "#ef4444", font: { family: "Sarabun", size: 12, weight: "bold" } }
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
}

// Initialize Global Controller
window.chartsPage = new ChartsPageController();
