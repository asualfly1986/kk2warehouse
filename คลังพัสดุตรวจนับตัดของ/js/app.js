/**
 * Application Controller for PEA Electrical Warehouse Management
 */

document.addEventListener("DOMContentLoaded", () => {
    window.app = new WarehouseApp();
});

class WarehouseApp {
    constructor() {
        this.db = window.db;
        this.audio = window.audioService;
        this.activeTab = "dashboard";
        this.dashboardFilter = "alerts";
        this.compFilter = "all";
        this.barChartPage = 0;
        this.selectedBarItem = null;
        this.selectedItemForModal = null;
        this.stockChart = null;
        this.barChart = null;
        
        // Sorting State (Default: null to preserve 1-99 Master Sheet Order)
        this.sortField = null;
        this.sortAsc = true;

        // Mobile Camera Scanner State
        this.html5QrCode = null;
        this.cameraFacingMode = "environment";
        this.isScanningActive = false;
        this.lastScannedTime = 0;

        this.initUI();
        this.initKeyboardScanner();
        this.initCloudflareSync(true).then(() => {
            this.renderDashboard();
            this.renderHistoryTable();
        });

        // Real-Time Polling Sync across devices every 2 seconds & on focus/visibility change
        setInterval(() => this.initCloudflareSync(), 2000);
        document.addEventListener("visibilitychange", () => {
            if (!document.hidden) this.initCloudflareSync(true);
        });
        window.addEventListener("focus", () => this.initCloudflareSync(true));
    }

    async initCloudflareSync(force = false) {
        try {
            await this.db.syncFromCloudflare();
        } catch (e) {
            console.log("Cloudflare sync notice:", e);
        }
        
        const currentDataHash = JSON.stringify(this.db.getItems()) + '_' + JSON.stringify(this.db.getLogs());
        if (!force && this.lastDataHash && this.lastDataHash === currentDataHash) {
            return; // 🛑 ข้อมูลไม่มีการเปลี่ยนแปลง หยุดการ re-render เพื่อแก้ปัญหาตารางกระพริบ
        }
        this.lastDataHash = currentDataHash;

        this.renderHistoryTable();
        if (this.activeTab === "dashboard") this.renderDashboard();
        if (this.activeTab === "stock") this.renderStockTable(document.getElementById("mainSearch")?.value || "");
        if (this.activeTab === "alerts") this.renderAlertsPage();
        if (this.activeTab === "comp") this.renderComparisonTable();
        if (this.activeTab === "history") this.renderHistoryTable();
    }

    initUI() {
        document.querySelectorAll(".nav-item").forEach(item => {
            item.addEventListener("click", (e) => {
                const targetTab = item.dataset.tab;
                if (targetTab) {
                    this.switchTab(targetTab);
                }
            });
        });

        // KPI Card Listeners
        const cardTotal = document.getElementById("kpiCardTotal");
        if (cardTotal) cardTotal.addEventListener("click", () => this.setDashboardFilter("all"));
        
        const cardOver = document.getElementById("kpiCardOver");
        if (cardOver) cardOver.addEventListener("click", () => this.setDashboardFilter("over"));

        const cardFull = document.getElementById("kpiCardFull");
        if (cardFull) cardFull.addEventListener("click", () => this.setDashboardFilter("full"));

        const cardGood = document.getElementById("kpiCardGood");
        if (cardGood) cardGood.addEventListener("click", () => this.setDashboardFilter("good"));

        const cardNormal = document.getElementById("kpiCardNormal");
        if (cardNormal) cardNormal.addEventListener("click", () => this.setDashboardFilter("normal"));

        const cardLow = document.getElementById("kpiCardLow");
        if (cardLow) cardLow.addEventListener("click", () => this.setDashboardFilter("low"));

        const cardOut = document.getElementById("kpiCardOut");
        if (cardOut) cardOut.addEventListener("click", () => this.setDashboardFilter("out_of_stock"));

        const mainSearch = document.getElementById("mainSearch");
        if (mainSearch) {
            mainSearch.addEventListener("input", (e) => {
                this.renderStockTable(e.target.value);
            });
        }

        const txForm = document.getElementById("txForm");
        if (txForm) {
            txForm.addEventListener("submit", (e) => {
                e.preventDefault();
                this.handleTransactionSubmit();
            });
        }

        document.querySelectorAll(".close-modal-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                this.closeModals();
            });
        });

        document.addEventListener("click", (e) => {
            const resultsBox = document.getElementById("barcodeSearchResults");
            const barcodeInput = document.getElementById("barcodeInput");
            if (resultsBox && barcodeInput) {
                if (!barcodeInput.contains(e.target) && !resultsBox.contains(e.target)) {
                    resultsBox.style.display = "none";
                }
            }
        });
    }

    initKeyboardScanner() {
        new KeyboardBarcodeScanner((scannedCode) => {
            this.handleScannedCode(scannedCode);
        });
    }

    getItemNotice(item) {
        if (!item) return "";
        if (item.specialNotice) return item.specialNotice;
        if (item.code === "1040030013") return "กฟส.ท่าพระสำรองได้เท่านั้น";
        if (item.code === "1040000002") return "กฟส.ชุมแพได้เท่านั้น";
        return "";
    }

    getItemNoticeHtml(item, fontSize = "11px") {
        const notice = this.getItemNotice(item);
        if (!notice) return "";
        return ` <span class="badge badge-orange" style="font-size: ${fontSize}; margin-left: 6px; padding: 2px 6px;">⚠️ ${notice}</span>`;
    }

    renderItemThumbnailHtml(item) {
        if (!item) return "";
        if (item.imageUrl) {
            return `
                <div class="item-thumb-container" onclick="event.stopPropagation(); app.openImageViewerModalByCode('${item.code}')" title="คลิกเพื่อขยายรูปภาพพัสดุ">
                    <img src="${item.imageUrl}" class="item-thumb-img" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: inherit;" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'44\\' height=\\'44\\' viewBox=\\'0 0 44 44\\'><rect width=\\'44\\' height=\\'44\\' fill=\\'%231e293b\\'/><text x=\\'22\\' y=\\'28\\' font-size=\\'20\\' text-anchor=\\'middle\\'>📷</text></svg>';">
                </div>
            `;
        }
        return `
            <div class="item-thumb-container" onclick="event.stopPropagation(); app.openTransactionModalByCode('${item.code}', 'dispense')" title="คลิกเพื่อแนบ/แก้ไขรูปภาพพัสดุ">
                <span class="item-thumb-placeholder">📷</span>
            </div>
        `;
    }

    openImageViewerModalByCode(code) {
        const item = this.db.getItemByCode(code);
        if (item) {
            this.selectedItemForModal = item;
            if (item.imageUrl) {
                this.openImageViewerModal(item.imageUrl, `[${item.code}] ${item.name}`);
            } else {
                this.openTransactionModal(item, "dispense");
            }
        }
    }

    openImageViewerModal(imageUrl, caption = "") {
        const modal = document.getElementById("imageViewerModal");
        const img = document.getElementById("imageViewerImg");
        const captionEl = document.getElementById("imageViewerCaption");
        if (modal && img) {
            img.src = imageUrl;
            if (captionEl) captionEl.textContent = caption;
            modal.removeAttribute("hidden");
            modal.style.setProperty("display", "flex", "important");
            modal.classList.add("active");
        }
    }

    closeImageViewerModal() {
        const modal = document.getElementById("imageViewerModal");
        if (modal) {
            modal.style.setProperty("display", "none", "important");
            modal.setAttribute("hidden", "true");
            modal.classList.remove("active");
        }
    }

    /**
     * Trigger File Picker synchronously on user gesture to avoid browser popup/gesture blocking
     */
    triggerItemPhotoUpload(code = null) {
        if (code) {
            const item = this.db.getItemByCode(code);
            if (item) this.selectedItemForModal = item;
        }

        if (!this.selectedItemForModal) {
            alert("⚠️ กรุณาเลือกรายการพัสดุก่อนแนบรูปภาพ");
            return;
        }

        // Verify Owner Password (Aunkung) BEFORE allowing file selection
        if (!this.authenticateOwner(`เปลี่ยน/อัปเดตรูปถ่ายพัสดุ [${this.selectedItemForModal.name}]`)) {
            return;
        }

        const fileInput = document.getElementById("itemFileInput");
        if (fileInput) {
            fileInput.value = "";
            fileInput.click();
        }
    }

    /**
     * Handle File selection and verify Owner Password (Aunkung) BEFORE saving
     */
    handleItemPhotoUpload(event) {
        const file = event.target.files && event.target.files[0];
        if (!file || !this.selectedItemForModal) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const rawBase64 = e.target.result;
            const img = new Image();

            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const targetSize = 480;
                canvas.width = targetSize;
                canvas.height = targetSize;
                const ctx = canvas.getContext("2d");

                // Draw image to fill 100% of 480x480 square canvas
                ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, targetSize, targetSize);

                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
                const itemCode = this.selectedItemForModal.code;

                try {
                    const updatedItem = await this.db.updateItemImage(itemCode, compressedBase64);
                    this.selectedItemForModal = updatedItem || { ...this.selectedItemForModal, imageUrl: compressedBase64 };
                    this.audio.playScanSuccess();

                    const container = document.getElementById("modalItemImageContainer");
                    if (container) {
                        container.innerHTML = `<img src="${compressedBase64}" class="item-thumb-img" alt="${this.selectedItemForModal.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
                        container.onclick = () => this.openImageViewerModalByCode(itemCode);
                    }

                    alert(`✅ อัปเดตและปรับรูปถ่ายใหม่ของพัสดุ [${this.selectedItemForModal.name}] ให้แสดงผลเต็มกรอบ 100% เรียบร้อยแล้ว!`);

                    this.closeImageViewerModal();
                    if (this.activeTab === "dashboard") this.renderDashboard();
                    if (this.activeTab === "stock") this.renderStockTable();
                    if (this.activeTab === "alerts") this.renderAlertsPage();
                } catch (err) {
                    this.audio.playError();
                    alert(`❌ ไม่สามารถบันทึกรูปภาพได้: ${err.message}`);
                }
            };

            img.onerror = () => {
                alert("⚠️ ไม่สามารถอ่านไฟล์รูปภาพได้ กรุณาเลือกไฟล์รูปภาพที่เป็น JPG หรือ PNG");
            };

            img.src = rawBase64;
        };
        reader.readAsDataURL(file);
    }

    handleResetSingleItemPhoto() {
        if (!this.selectedItemForModal) return;

        // Verify Owner Password (Aunkung)
        if (!this.authenticateOwner(`รีเซตรูปภาพพัสดุ [${this.selectedItemForModal.name}] กลับเป็นค่าเริ่มต้น`)) {
            return;
        }

        try {
            this.db.resetItemImage(this.selectedItemForModal.code);
            this.selectedItemForModal = { ...this.selectedItemForModal, imageUrl: null };
            this.audio.playScanSuccess();
            alert(`✅ คืนค่ารูปภาพพัสดุเริ่มต้นเรียบร้อยแล้ว`);
            this.closeImageViewerModal();
            if (this.activeTab === "dashboard") this.renderDashboard();
            if (this.activeTab === "stock") this.renderStockTable();
        } catch (err) {
            this.audio.playError();
            alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
        }
    }

    /**
     * Sort items array dynamically
     */
    handleSort(field) {
        if (this.sortField === field) {
            this.sortAsc = !this.sortAsc;
        } else {
            this.sortField = field;
            this.sortAsc = true;
        }
        this.audio.playScanSuccess();

        if (this.activeTab === "dashboard") this.renderDashboardTable();
        if (this.activeTab === "stock") this.renderStockTable();
        if (this.activeTab === "alerts") this.renderAlertsPage();
    }

    sortItems(items) {
        if (!this.sortField) return items;

        return [...items].sort((a, b) => {
            let valA = a[this.sortField];
            let valB = b[this.sortField];

            if (this.sortField === 'pct') {
                valA = window.getItemStatus(a.currentQty, a.standard).pct;
                valB = window.getItemStatus(b.currentQty, b.standard).pct;
            } else if (this.sortField === 'wmsVsMb52') {
                valA = Number(a.wmsQty || 0) - Number(a.mb52Qty || 0);
                valB = Number(b.wmsQty || 0) - Number(b.mb52Qty || 0);
            } else if (this.sortField === 'comparison') {
                const isEqA = (Number(a.currentQty||0) === Number(a.mb52Qty||0) && Number(a.currentQty||0) === Number(a.wmsQty||0) && Number(a.currentQty||0) === Number(a.kk23Qty||0)) ? 1 : 0;
                const isEqB = (Number(b.currentQty||0) === Number(b.mb52Qty||0) && Number(b.currentQty||0) === Number(b.wmsQty||0) && Number(b.currentQty||0) === Number(b.kk23Qty||0)) ? 1 : 0;
                valA = isEqA;
                valB = isEqB;
            } else if (this.sortField === 'currentQty' || this.sortField === 'standard' || this.sortField === 'mb52Qty' || this.sortField === 'wmsQty' || this.sortField === 'kk23Qty') {
                valA = Number(valA || 0);
                valB = Number(valB || 0);
            }

            if (typeof valA === 'string') {
                return this.sortAsc ? valA.localeCompare(valB, 'th') : valB.localeCompare(valA, 'th');
            }
            return this.sortAsc ? valA - valB : valB - valA;
        });
    }

    renderWmsVsMb52Cell(item) {
        const wms = Number(item.wmsQty || 0);
        const mb52 = Number(item.mb52Qty || 0);
        const diff = wms - mb52;

        if (diff === 0) {
            return `<div style="text-align: center;">
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; padding: 3px 8px; white-space: nowrap;">
                    🟢 เท่ากัน (0)
                </span>
            </div>`;
        } else if (diff > 0) {
            return `<div style="text-align: center; font-weight: 700; color: #3b82f6; white-space: nowrap;" title="WMS มีมากกว่า MB52 อยู่ ${diff} ${item.unit}">
                🔵 WMS > MB52 (+${diff})
            </div>`;
        } else {
            return `<div style="text-align: center; font-weight: 700; color: #ef4444; white-space: nowrap;" title="WMS มีน้อยกว่า MB52 อยู่ ${Math.abs(diff)} ${item.unit}">
                🔴 WMS < MB52 (${diff})
            </div>`;
        }
    }

    renderLocationComparisonCell(item) {
        const qty2601 = Number(item.currentQty || 0);
        const mb52 = Number(item.mb52Qty || 0);
        const wms = Number(item.wmsQty || 0);
        const kk23 = Number(item.kk23Qty || 0);

        const isAllEqual = (qty2601 === mb52 && qty2601 === wms && qty2601 === kk23);

        if (isAllEqual) {
            return `<div style="text-align: center;">
                <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; padding: 3px 8px; white-space: nowrap;">
                    🟢 ตรงกันทุกคลัง (=)
                </span>
            </div>`;
        }

        const fmtDiff = (val, base, label) => {
            const d = val - base;
            if (d === 0) return `<span>${label}: <strong style="color:#10b981;">เท่ากัน (=)</strong></span>`;
            if (d > 0) return `<span>${label}: <strong style="color:#3b82f6;">มากกว่า (+${d})</strong></span>`;
            return `<span>${label}: <strong style="color:#ef4444;">น้อยกว่า (${d})</strong></span>`;
        };

        return `<div style="font-size: 11px; line-height: 1.35; white-space: nowrap;">
            <div>📊 ${fmtDiff(mb52, qty2601, 'MB52')}</div>
            <div>📦 ${fmtDiff(wms, qty2601, 'WMS')}</div>
            <div>🏢 ${fmtDiff(kk23, qty2601, 'คลัง0023')}</div>
        </div>`;
    }

    switchTab(tabId) {
        this.activeTab = tabId;

        document.querySelectorAll(".nav-item").forEach(item => {
            if (item.dataset.tab === tabId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        document.querySelectorAll(".page-container").forEach(page => {
            if (page.id === `page-${tabId}`) {
                page.classList.add("active");
            } else {
                page.classList.remove("active");
            }
        });

        const titleMap = {
            dashboard: "ภาพรวมคลังพัสดุ (Dashboard)",
            scan: "สแกนบาร์โค้ด เบิก-รับ-ตัดยอด",
            stock: "รายการพัสดุและสต็อกทั้งหมด",
            alerts: "รายงานพัสดุต่ำกว่าเกณฑ์มาตรฐาน",
            comparison: "ตารางเปรียบเทียบยอดคงเหลือ WMS และ MB52 ที่นำเข้า",
            history: "ประวัติเบิก-รับย้อนหลัง",
            labels: "พิมพ์ป้ายบาร์โค้ดพัสดุ",
            settings: "จัดการสิทธิ์ / สำรองข้อมูล"
        };
        const pageTitleEl = document.getElementById("currentPageTitle");
        if (pageTitleEl) pageTitleEl.textContent = titleMap[tabId] || "คลังพัสดุ";

        if (tabId === "dashboard") this.renderDashboard();
        if (tabId === "stock") this.renderStockTable();
        if (tabId === "alerts") this.renderAlertsPage();
        if (tabId === "comparison") this.renderComparisonTable();
        if (tabId === "history") this.renderHistoryTable();
        if (tabId === "labels") this.renderBarcodeLabels();
        if (tabId === "settings") this.renderSettingsPage();
        if (tabId === "scan") this.focusScanInput();

        if (tabId !== "scan") {
            this.stopCameraScanner();
        }
    }

    focusScanInput() {
        setTimeout(() => {
            const scanInput = document.getElementById("barcodeInput");
            if (scanInput) scanInput.focus();
        }, 100);
    }

    handleScannedCode(code) {
        const item = this.db.getItemByCode(code);
        if (item) {
            this.audio.playScanSuccess();
            this.openTransactionModal(item, "dispense");
        } else {
            this.audio.playError();
            alert(`⚠️ ไม่พบรหัสพัสดุ [${code}] ในฐานข้อมูล!`);
        }
    }

    handleManualScanInput() {
        const input = document.getElementById("barcodeInput");
        const resultsBox = document.getElementById("barcodeSearchResults");
        if (resultsBox) resultsBox.style.display = "none";

        if (!input) return;
        const code = input.value.trim();
        if (code) {
            this.handleScannedCode(code);
            input.value = "";
        }
    }

    handleBarcodeInputLiveSearch(query) {
        const resultsBox = document.getElementById("barcodeSearchResults");
        if (!resultsBox) return;

        const cleanQuery = query ? query.trim().toLowerCase() : "";
        if (!cleanQuery) {
            resultsBox.style.display = "none";
            resultsBox.innerHTML = "";
            return;
        }

        const items = this.db.getItems();
        const matched = items.filter(i => {
            const codeMatch = i.code && i.code.toLowerCase().includes(cleanQuery);
            const nameMatch = i.name && i.name.toLowerCase().includes(cleanQuery);
            return codeMatch || nameMatch;
        }).slice(0, 10); // Display top 10 matches

        if (matched.length === 0) {
            resultsBox.innerHTML = `
                <div style="padding: 12px 16px; text-align: center; color: var(--text-secondary); font-size: 13px;">
                    ⚠️ ไม่พบรหัสหรือชื่อพัสดุที่ตรงกับ "${query}"
                </div>
            `;
            resultsBox.style.display = "block";
            return;
        }

        resultsBox.innerHTML = matched.map(item => {
            const status = window.getItemStatus(item.currentQty, item.standard);
            const noticeHtml = this.getItemNoticeHtml(item, "10px");
            const safeUrl = item.imageUrl ? encodeURI(item.imageUrl) : "";
            const thumbHtml = item.imageUrl 
                ? `<img src="${safeUrl}" loading="lazy" style="width: 38px; height: 38px; object-fit: fill; border-radius: 6px; display: block; border: 1px solid var(--border-color);" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\"width: 38px; height: 38px; border-radius: 6px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 18px;\">📦</div>';">`
                : `<div style="width: 38px; height: 38px; border-radius: 6px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 18px;">📦</div>`;

            return `
                <div class="search-suggest-item" onclick="app.selectSuggestedItem('${item.code}')">
                    ${thumbHtml}
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                            <span class="search-suggest-code">${item.code}</span>
                            <span class="badge ${status.badgeClass}" style="font-size: 10px; padding: 2px 6px;">${status.label}</span>
                            ${noticeHtml}
                        </div>
                        <div class="search-suggest-name" style="margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.name}">${item.name}</div>
                    </div>
                    <div class="search-suggest-stock">
                        คงเหลือ: <strong style="color: ${status.key==='out_of_stock'?'#ef4444':'#34d399'}; font-size: 13px;">${item.currentQty}</strong> / std: ${item.standard} ${item.unit}
                    </div>
                </div>
            `;
        }).join("");

        resultsBox.style.display = "block";
    }

    selectSuggestedItem(code) {
        const item = this.db.getItemByCode(code);
        const resultsBox = document.getElementById("barcodeSearchResults");
        const barcodeInput = document.getElementById("barcodeInput");
        
        if (resultsBox) resultsBox.style.display = "none";
        if (barcodeInput) barcodeInput.value = code;

        if (item) {
            this.audio.playScanSuccess();
            this.openTransactionModal(item, "dispense");
        }
    }

    async startCameraScanner() {
        if (typeof Html5Qrcode === "undefined") {
            alert("⚠️ ระบบกล้องกำลังโหลดตัวอ่านบาร์โค้ด กรุณาลองใหม่อีกครั้งใน 2-3 วินาที");
            return;
        }

        const container = document.getElementById("cameraScannerContainer");
        const btnStart = document.getElementById("btnStartCamera");
        const btnStop = document.getElementById("btnStopCamera");
        const btnSwitch = document.getElementById("btnSwitchCamera");

        if (container) container.style.display = "block";
        if (btnStart) btnStart.style.display = "none";
        if (btnStop) btnStop.style.display = "inline-flex";
        if (btnSwitch) btnSwitch.style.display = "inline-flex";

        if (!this.html5QrCode) {
            this.html5QrCode = new Html5Qrcode("cameraScannerView");
        }

        const config = {
            fps: 15,
            qrbox: { width: 280, height: 160 },
            aspectRatio: 1.333333
        };

        try {
            this.isScanningActive = true;
            await this.html5QrCode.start(
                { facingMode: this.cameraFacingMode },
                config,
                (decodedText, decodedResult) => {
                    this.onCameraBarcodeScanned(decodedText);
                },
                (errorMessage) => {
                    // Ignore scan errors while searching for barcode frame
                }
            );
        } catch (err) {
            console.error("Camera start error:", err);
            alert(`⚠️ ไม่สามารถเปิดกล้องได้: ${err.message || 'กรุณาอนุญาตสิทธิ์การใช้กล้องในเบราว์เซอร์มือถือ'}`);
            this.stopCameraScanner();
        }
    }

    async stopCameraScanner() {
        if (this.html5QrCode && this.isScanningActive) {
            try {
                await this.html5QrCode.stop();
            } catch (err) {
                console.warn("Camera stop error:", err);
            }
        }
        this.isScanningActive = false;

        const container = document.getElementById("cameraScannerContainer");
        const btnStart = document.getElementById("btnStartCamera");
        const btnStop = document.getElementById("btnStopCamera");
        const btnSwitch = document.getElementById("btnSwitchCamera");

        if (container) container.style.display = "none";
        if (btnStart) btnStart.style.display = "inline-flex";
        if (btnStop) btnStop.style.display = "none";
        if (btnSwitch) btnSwitch.style.display = "none";
    }

    async switchCameraFacingMode() {
        this.cameraFacingMode = (this.cameraFacingMode === "environment") ? "user" : "environment";
        if (this.isScanningActive) {
            await this.stopCameraScanner();
            await this.startCameraScanner();
        }
    }

    onCameraBarcodeScanned(code) {
        const now = Date.now();
        if (now - this.lastScannedTime < 2500) {
            return; // Prevent duplicate trigger within 2.5s
        }
        this.lastScannedTime = now;

        const trimmedCode = code.trim();
        const item = this.db.getItemByCode(trimmedCode);

        if (item) {
            this.audio.playScanSuccess();
            const statusEl = document.getElementById("cameraScanStatus");
            if (statusEl) {
                statusEl.textContent = `✅ สแกนเจอ: [${item.code}] ${item.name}`;
                statusEl.style.color = "#34d399";
            }
            this.openTransactionModal(item, "dispense");
        } else {
            this.audio.playError();
            const statusEl = document.getElementById("cameraScanStatus");
            if (statusEl) {
                statusEl.textContent = `⚠️ สแกนเจอ [${trimmedCode}] แต่ไม่พบในฐานข้อมูล`;
                statusEl.style.color = "#ef4444";
            }
        }
    }

    updateRequestersDatalist() {
        const selectEl = document.getElementById("txRequesterSelect");
        const inputEl = document.getElementById("txRequester");
        if (!selectEl) return;

        const requesters = this.db.getRequesters();

        let optionsHtml = `<option value="" disabled selected>🔻 -- แตะที่นี่เพื่อเลือกรายชื่อผู้เบิก / หน่วยงาน --</option>`;
        optionsHtml += requesters.map(r => `<option value="${r}">👤 ${r}</option>`).join("");
        optionsHtml += `<option value="__custom__">✏️ + พิมพ์ป้อนชื่อผู้เบิก / หน่วยงานอื่น...</option>`;

        selectEl.innerHTML = optionsHtml;

        if (inputEl) {
            inputEl.style.display = "none";
            inputEl.value = "";
        }
    }

    handleRequesterSelectChange(val) {
        const inputEl = document.getElementById("txRequester");
        if (!inputEl) return;

        if (val === "__custom__") {
            inputEl.style.display = "block";
            inputEl.value = "";
            inputEl.focus();
        } else {
            inputEl.style.display = "none";
            inputEl.value = val;
        }
    }

    openTransactionModal(item, defaultType = "dispense") {
        if (this.activeTab !== "scan") {
            this.switchTab("scan");
        }
        this.closeModals();
        this.selectedItemForModal = item;
        const status = window.getItemStatus(item.currentQty, item.standard);
        const hasAuditPerm = this.db.getAuditPermission();

        document.getElementById("modalItemCode").textContent = item.code;
        
        let modalItemNameHtml = item.name + this.getItemNoticeHtml(item, "12px");
        document.getElementById("modalItemName").innerHTML = modalItemNameHtml;

        document.getElementById("modalCurrentQty").textContent = `${item.currentQty} ${item.unit} (${status.pct}%)`;
        document.getElementById("modalStandardQty").textContent = `${item.standard} ${item.unit}`;
        
        // Render Modal Image Thumbnail
        const modalImgContainer = document.getElementById("modalItemImageContainer");
        if (modalImgContainer) {
            if (item.imageUrl) {
                modalImgContainer.innerHTML = `<img src="${item.imageUrl}" class="item-thumb-img" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 8px;" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'72\\' height=\\'72\\' viewBox=\\'0 0 72 72\\'><rect width=\\'72\\' height=\\'72\\' fill=\\'%231e293b\\'/><text x=\\'36\\' y=\\'44\\' font-size=\\'32\\' text-anchor=\\'middle\\'>📷</text></svg>';">`;
                modalImgContainer.onclick = () => this.openImageViewerModalByCode(item.code);
            } else {
                modalImgContainer.innerHTML = `<span class="item-thumb-placeholder">📷</span>`;
                modalImgContainer.onclick = () => this.triggerItemPhotoUpload(item.code);
            }
        }

        document.getElementById("txCode").value = item.code;
        
        const txTypeSelect = document.getElementById("txType");
        const auditOption = txTypeSelect.querySelector("option[value='audit']");
        
        if (auditOption) {
            if (hasAuditPerm) {
                auditOption.disabled = false;
                auditOption.textContent = "📋 ปรับยอดจากการตรวจนับ (สิทธิ์ Owner: ต้องกรอกรหัสผ่านทุกครั้ง)";
            } else {
                auditOption.disabled = true;
                auditOption.textContent = "🔒 ปรับยอดจากการตรวจนับ (ถูกยกเลิกสิทธิ์โดยเจ้าของ)";
            }
        }

        if (defaultType === "audit" && !hasAuditPerm) {
            txTypeSelect.value = "dispense";
            alert("⚠️ สิทธิ์การปรับยอดตรวจนับถูกปิดใช้งานโดยเจ้าของระบบ ระบบจะปรับเป็นรายการเบิกจ่ายแทน");
        } else {
            txTypeSelect.value = defaultType;
        }

        this.handleTxTypeChange(txTypeSelect.value);

        if (txTypeSelect.value === "audit") {
            document.getElementById("txQty").value = String(item.currentQty);
        } else {
            document.getElementById("txQty").value = "1";
        }

        this.updateRequestersDatalist();

        document.getElementById("txQtyUnit").textContent = item.unit;
        document.getElementById("txRequester").value = "";
        document.getElementById("txWorkOrder").value = "";
        document.getElementById("txNote").value = "";

        const modal = document.getElementById("txModal");
        if (modal) {
            modal.removeAttribute("hidden");
            modal.style.setProperty("display", "flex", "important");
            modal.classList.add("active");
        }
    }

    handleTxTypeChange(type) {
        const qtyInput = document.getElementById("txQty");
        if (!qtyInput) return;

        if (type === "audit") {
            qtyInput.setAttribute("min", "0");
            qtyInput.placeholder = "ป้อนยอดคงเหลือจริงจากการตรวจนับ (ใส่ 0 ได้)...";
        } else {
            qtyInput.setAttribute("min", "1");
            qtyInput.placeholder = "ป้อนจำนวนที่ต้องการทำรายการ...";
            if (Number(qtyInput.value) <= 0) {
                qtyInput.value = "1";
            }
        }
    }

    closeModals() {
        document.querySelectorAll(".modal-overlay").forEach(m => {
            m.classList.remove("active");
            m.style.setProperty("display", "none", "important");
            m.setAttribute("hidden", "true");
        });
        this.selectedItemForModal = null;
    }

    async handleTransactionSubmit() {
        const type = document.getElementById("txType").value;
        const code = document.getElementById("txCode").value;
        const qtyRaw = document.getElementById("txQty").value;
        const qty = Number(qtyRaw);

        if (qtyRaw === "" || isNaN(qty)) {
            this.audio.playError();
            alert("⚠️ กรุณาระบุจำนวนที่ต้องการทำรายการ");
            document.getElementById("txQty").focus();
            return;
        }

        if (type === "audit") {
            if (qty < 0) {
                this.audio.playError();
                alert("⚠️ ยอดคงเหลือพัสดุจากการตรวจนับต้องไม่ติดลบ (สามารถใส่ค่า 0 หรือมากกว่าได้)");
                document.getElementById("txQty").focus();
                return;
            }
        } else {
            if (qty <= 0) {
                this.audio.playError();
                alert("⚠️ จำนวนพัสดุสำหรับการเบิกจ่ายหรือรับเข้าต้องมากกว่า 0");
                document.getElementById("txQty").focus();
                return;
            }
        }
        
        const selectEl = document.getElementById("txRequesterSelect");
        const inputEl = document.getElementById("txRequester");
        let requester = (inputEl ? inputEl.value : "").trim();
        
        if (!requester && selectEl && selectEl.value && selectEl.value !== "__custom__") {
            requester = selectEl.value.trim();
        }

        if (!requester) {
            this.audio.playError();
            alert("⚠️ กรุณาแตะเลือกรายชื่อผู้เบิก / หน่วยงาน จาก Dropdown List หรือพิมพ์ป้อนข้อมูล");
            if (selectEl && selectEl.value === "__custom__" && inputEl) inputEl.focus();
            else if (selectEl) selectEl.focus();
            return;
        }

        const workOrder = document.getElementById("txWorkOrder").value.trim();
        const note = document.getElementById("txNote").value.trim();

        // Enforce Owner Password Authentication (PIN: Aunkung) for Audit / Count Override
        if (type === "audit") {
            const item = this.db.getItemByCode(code);
            const itemName = item ? item.name : code;
            if (!this.authenticateOwner(`ปรับยอดจากการตรวจนับพัสดุ [${itemName}]`)) {
                return;
            }
        }

        try {
            const result = await this.db.processTransaction(type, code, qty, requester, workOrder, note);
            this.audio.playScanSuccess();
            this.closeModals();

            const actionText = type === "dispense" ? "เบิกจ่าย" : (type === "receive" ? "รับเข้า" : "ปรับยอดตรวจนับ");
            const itemObj = (result && result.item) ? result.item : result;
            alert(`✅ ทำรายการ [${actionText}] สำเร็จ!\nพัสดุ: ${itemObj.name}\nคงเหลือจริง(storage location 2601): ${itemObj.currentQty} ${itemObj.unit}`);

            if (this.activeTab === "dashboard") this.renderDashboard();
            if (this.activeTab === "stock") this.renderStockTable();
            if (this.activeTab === "alerts") this.renderAlertsPage();
            if (this.activeTab === "history") this.renderHistoryTable();

            // Trigger immediate Cloudflare D1 push & cross-tab sync
            if (typeof this.db.pushToCloudflare === "function") {
                await this.db.pushToCloudflare();
            }

        } catch (err) {
            this.audio.playError();
            alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
        }
    }

    setDashboardFilter(filterType) {
        this.dashboardFilter = filterType;
        this.barChartPage = 0;
        this.selectedBarItem = null;
        
        document.querySelectorAll(".stat-card").forEach(card => card.classList.remove("active-filter"));
        if (filterType === "all") document.getElementById("kpiCardTotal")?.classList.add("active-filter");
        if (filterType === "over") document.getElementById("kpiCardOver")?.classList.add("active-filter");
        if (filterType === "full") document.getElementById("kpiCardFull")?.classList.add("active-filter");
        if (filterType === "good") document.getElementById("kpiCardGood")?.classList.add("active-filter");
        if (filterType === "normal") document.getElementById("kpiCardNormal")?.classList.add("active-filter");
        if (filterType === "low") document.getElementById("kpiCardLow")?.classList.add("active-filter");
        if (filterType === "out_of_stock") document.getElementById("kpiCardOut")?.classList.add("active-filter");

        document.querySelectorAll(".filter-pill").forEach(pill => {
            if (pill.dataset.filter === filterType) {
                pill.classList.add("active");
            } else {
                pill.classList.remove("active");
            }
        });

        this.renderDashboardTable();
        this.renderCharts(this.db.getStats());
    }

    changeBarChartPage(direction) {
        const items = this.getFilteredDashboardItems();
        const totalPages = Math.ceil(items.length / 20) || 1;

        if (direction === "next" && this.barChartPage < totalPages - 1) {
            this.barChartPage++;
        } else if (direction === "prev" && this.barChartPage > 0) {
            this.barChartPage--;
        } else if (typeof direction === "number") {
            this.barChartPage = direction;
        }

        this.selectedBarItem = null;
        this.renderCharts(this.db.getStats());
    }

    renderDashboard() {
        const stats = this.db.getStats();

        document.getElementById("statTotalSKU").textContent = stats.totalSKU;
        document.getElementById("statOverCount").textContent = stats.overCount;
        document.getElementById("statFullCount").textContent = stats.fullCount;
        document.getElementById("statGoodCount").textContent = stats.goodCount;
        document.getElementById("statNormalCount").textContent = stats.normalCount;
        document.getElementById("statLowCount").textContent = stats.lowCount;
        document.getElementById("statOutOfStock").textContent = stats.outOfStockCount;

        const alertBadge = document.getElementById("navAlertBadge");
        if (alertBadge) {
            alertBadge.textContent = stats.alertCount;
            alertBadge.style.display = stats.alertCount > 0 ? "inline-block" : "none";
        }

        this.renderDashboardTable();
        this.renderCharts(stats);
    }

    getFilteredDashboardItems() {
        const items = this.db.getItems();
        let filtered = [];
        if (this.dashboardFilter === "alerts") {
            filtered = items.filter(i => {
                const s = window.getItemStatus(i.currentQty, i.standard);
                return s.key === "out_of_stock" || s.key === "low";
            });
        } else if (this.dashboardFilter === "out_of_stock") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "out_of_stock");
        } else if (this.dashboardFilter === "low") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "low");
        } else if (this.dashboardFilter === "normal") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "normal");
        } else if (this.dashboardFilter === "good") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "good");
        } else if (this.dashboardFilter === "full") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "full");
        } else if (this.dashboardFilter === "over") {
            filtered = items.filter(i => window.getItemStatus(i.currentQty, i.standard).key === "over");
        } else {
            filtered = items;
        }
        return this.sortItems(filtered);
    }

    getOriginalIndex(item) {
        const allItems = this.db.getItems();
        const foundIdx = allItems.findIndex(i => i.code === item.code);
        return foundIdx !== -1 ? foundIdx + 1 : "-";
    }

    renderDashboardTable() {
        const displayItems = this.getFilteredDashboardItems();
        let titleText = "⚠️ รายการพัสดุแจ้งเตือนต้องสั่งซื้อ/จัดหา";

        if (this.dashboardFilter === "alerts") titleText = "⚠️ พัสดุต้องจัดซื้อ/จัดหา (<50%) และพัสดุเตือน (50-60%)";
        else if (this.dashboardFilter === "out_of_stock") titleText = "🔴 พัสดุต้องจัดซื้อ/จัดหา (Min. Stock <50%)";
        else if (this.dashboardFilter === "low") titleText = "🟧 พัสดุเตือน (50-60% Warning)";
        else if (this.dashboardFilter === "normal") titleText = "🟡 พัสดุพอดี (61-80% Fair)";
        else if (this.dashboardFilter === "good") titleText = "🟢 พัสดุดี (81-99% Good)";
        else if (this.dashboardFilter === "full") titleText = "❇️ พัสดุเต็ม 100% (100% Full)";
        else if (this.dashboardFilter === "over") titleText = "🔵 พัสดุเกิน 100% (Over Stock >100%)";
        else if (this.dashboardFilter === "all") titleText = "📦 ข้อมูลพัสดุทั้งหมดในระบบ";

        const titleEl = document.getElementById("dashboardTableTitle");
        if (titleEl) titleEl.textContent = `${titleText} (${displayItems.length} รายการ)`;

        const tbody = document.getElementById("dashboardAlertsTbody");
        if (tbody) {
            if (displayItems.length === 0) {
                tbody.innerHTML = `<tr><td colspan="13" style="text-align: center; color: var(--success); font-weight: 600; padding: 24px;">🎉 ไม่พบรายการในหมวดหมู่ที่เลือก</td></tr>`;
            } else {
                tbody.innerHTML = displayItems.map((item, index) => {
                    const status = window.getItemStatus(item.currentQty, item.standard);
                    let colorStyle = '#34d399';
                    if (status.key === 'out_of_stock') colorStyle = '#ef4444';
                    else if (status.key === 'low') colorStyle = '#f97316';
                    else if (status.key === 'normal') colorStyle = '#a3e635';
                    else if (status.key === 'good') colorStyle = '#34d399';
                    else if (status.key === 'full') colorStyle = '#10b981';
                    else if (status.key === 'over') colorStyle = '#3b82f6';

                    const noticeHtml = this.getItemNoticeHtml(item);
                    const thumbHtml = this.renderItemThumbnailHtml(item);
                    const compHtml = this.renderLocationComparisonCell(item);
                    const rowNum = this.sortField ? (index + 1) : this.getOriginalIndex(item);

                    return `
                        <tr onclick="app.openTransactionModalByCode('${item.code}', 'dispense')" style="cursor: pointer;">
                            <td style="font-weight: 700; color: var(--accent-primary); text-align: center;">${rowNum}</td>
                            <td>${thumbHtml}</td>
                            <td><code style="font-family: monospace; color: var(--accent-primary); font-weight: 600;">${item.code}</code></td>
                            <td style="font-weight: 500;">
                                ${item.name}${noticeHtml}
                            </td>
                            <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
                            <td style="background: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; font-weight: 700; text-align: center; border-left: 1px dashed rgba(16, 185, 129, 0.3); border-right: 1px dashed rgba(16, 185, 129, 0.3);">${item.standard} ${item.unit}</td>
                            <td style="font-weight: 700; color: ${colorStyle}">${item.currentQty} ${item.unit}</td>
                            <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.mb52Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                            <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.wmsQty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                            <td onclick="event.stopPropagation()">${this.renderWmsVsMb52Cell(item)}</td>
                            <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.kk23Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                            <td>${compHtml}</td>
                            <td style="font-weight: 700; color: ${colorStyle}">${status.pct}%</td>
                            <td onclick="event.stopPropagation()">
                                <div style="display: flex; gap: 4px;">
                                    <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="app.openTransactionModalByCode('${item.code}', 'dispense')">
                                        📤 เบิก
                                    </button>
                                    <button class="btn btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="app.openTransactionModalByCode('${item.code}', 'receive')">
                                        📥 เติม
                                    </button>
                                    <button class="btn btn-outline" style="padding: 4px 6px; font-size: 11px;" onclick="app.openLocationEditModal('${item.code}')" title="ปรับยอด 3 คลัง (เฉพาะ Owner)">
                                        ✏️ คลัง
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join("");
            }
        }
    }

    renderCharts(stats) {
        if (typeof Chart === "undefined") return;

        // 1. Doughnut Chart (6 Status Levels & Exact Colors)
        const canvasDoughnut = document.getElementById("stockStatusChart");
        if (canvasDoughnut) {
            if (this.stockChart) this.stockChart.destroy();
            const ctxD = canvasDoughnut.getContext("2d");
            this.stockChart = new Chart(ctxD, {
                type: "doughnut",
                data: {
                    labels: ["🔵 เกิน 100%", "❇️ เต็ม 100%", "🟢 ดี (81-99%)", "🟡 พอดี (61-80%)", "🟧 เตือน (50-60%)", "🔴 จัดซื้อ (<50%)"],
                    datasets: [{
                        data: [stats.overCount, stats.fullCount, stats.goodCount, stats.normalCount, stats.lowCount, stats.outOfStockCount],
                        backgroundColor: ["#3b82f6", "#059669", "#34d399", "#a3e635", "#f97316", "#ef4444"],
                        borderWidth: 2,
                        borderColor: "#1e293b",
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const filterMap = ["over", "full", "good", "normal", "low", "out_of_stock"];
                            this.setDashboardFilter(filterMap[index]);
                            this.audio.playScanSuccess();
                        }
                    },
                    onHover: (event, activeElements) => {
                        event.native.target.style.cursor = activeElements.length ? 'pointer' : 'default';
                    },
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: { color: "#94a3b8", font: { family: "Sarabun", size: 10 }, padding: 6 }
                        }
                    }
                }
            });
        }

        // 2. Bar Chart
        const canvasBar = document.getElementById("stockComparisonChart");
        if (canvasBar) {
            if (this.barChart) this.barChart.destroy();

            const allFilteredItems = this.getFilteredDashboardItems();
            const pageSize = 20;
            const totalPages = Math.ceil(allFilteredItems.length / pageSize) || 1;
            
            if (this.barChartPage >= totalPages) this.barChartPage = totalPages - 1;
            if (this.barChartPage < 0) this.barChartPage = 0;

            const startIndex = this.barChartPage * pageSize;
            const endIndex = startIndex + pageSize;
            const pageItems = allFilteredItems.slice(startIndex, endIndex);

            const pageControlsEl = document.getElementById("barChartPageControls");
            if (pageControlsEl) {
                pageControlsEl.innerHTML = `
                    <button class="btn btn-outline" style="padding: 2px 8px; font-size: 11px;" ${this.barChartPage === 0 ? 'disabled' : ''} onclick="app.changeBarChartPage('prev')">◀ ก่อนหน้า</button>
                    <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">
                        รายการ ${startIndex + 1} - ${Math.min(endIndex, allFilteredItems.length)} จาก ${allFilteredItems.length} (หน้า ${this.barChartPage + 1}/${totalPages})
                    </span>
                    <button class="btn btn-outline" style="padding: 2px 8px; font-size: 11px;" ${this.barChartPage >= totalPages - 1 ? 'disabled' : ''} onclick="app.changeBarChartPage('next')">ถัดไป ▶</button>
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
                return "#3b82f6"; // over 100%
            });

            const ctxB = canvasBar.getContext("2d");
            this.barChart = new Chart(ctxB, {
                type: "bar",
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: "คงเหลือจริง(storage location 2601)",
                            data: currentData,
                            backgroundColor: currentColors,
                            borderRadius: 4,
                            grouped: false,
                            barPercentage: 0.4,
                            categoryPercentage: 0.8,
                            order: 1
                        },
                        {
                            label: "เกณฑ์มาตรฐาน (Standard Stock)",
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
                    onClick: (event, activeElements) => {
                        if (activeElements && activeElements.length > 0) {
                            const index = activeElements[0].index;
                            const item = pageItems[index];
                            if (item) {
                                this.selectedBarItem = item;
                                this.renderBarChartItemPreview(item);
                            }
                        }
                    },
                    onHover: (event, activeElements) => {
                        event.native.target.style.cursor = activeElements.length ? 'pointer' : 'default';
                    },
                    layout: {
                        padding: {
                            bottom: 16
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
                        },
                        tooltip: {
                            titleFont: { family: "Sarabun", size: 14, weight: "bold" },
                            bodyFont: { family: "Sarabun", size: 12 },
                            padding: 12,
                            displayColors: true,
                            callbacks: {
                                title: (tooltipItems) => {
                                    if (tooltipItems.length > 0) {
                                        const idx = tooltipItems[0].dataIndex;
                                        const item = pageItems[idx];
                                        if (item) {
                                            let title = `📌 ${item.name}`;
                                            const notice = this.getItemNotice(item);
                                            if (notice) {
                                                title += ` (⚠️ ${notice})`;
                                            }
                                            return title;
                                        }
                                    }
                                    return "";
                                },
                                label: (context) => {
                                    const item = pageItems[context.dataIndex];
                                    if (!item) return "";
                                    const status = window.getItemStatus(item.currentQty, item.standard);
                                    if (context.datasetIndex === 0) {
                                        const labelsList = [
                                            ` รหัสพัสดุ: ${item.code}`,
                                            ` คงเหลือจริง(storage location 2601): ${context.raw} ${item.unit} (${status.pct}%)`,
                                            ` สถานะ: ${status.label}`
                                        ];
                                        const notice = this.getItemNotice(item);
                                        if (notice) {
                                            labelsList.push(` ⚠️ หมายเหตุเฉพาะ: ${notice}`);
                                        }
                                        return labelsList;
                                    }
                                    return ` เกณฑ์มาตรฐาน: ${context.raw} ${item.unit}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    renderBarChartItemPreview(item) {
        const previewEl = document.getElementById("barChartItemPreview");
        if (!previewEl) return;

        const status = window.getItemStatus(item.currentQty, item.standard);
        const noticeHtml = this.getItemNoticeHtml(item, "12px");
        const thumbHtml = this.renderItemThumbnailHtml(item);
        
        let colorCode = '#34d399';
        if (status.key === 'out_of_stock') colorCode = '#ef4444';
        else if (status.key === 'low') colorCode = '#f97316';
        else if (status.key === 'normal') colorCode = '#a3e635';
        else if (status.key === 'good') colorCode = '#34d399';
        else if (status.key === 'full') colorCode = '#059669';
        else if (status.key === 'over') colorCode = '#3b82f6';

        previewEl.innerHTML = `
            <div style="background: rgba(30, 41, 59, 0.9); border: 1px solid var(--accent-primary); border-radius: var(--radius-md); padding: 14px 18px; margin-top: 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; animation: fadeIn 0.2s ease;">
                <div class="item-flex-cell">
                    ${thumbHtml}
                    <div>
                        <div style="font-size: 12px; color: var(--accent-primary); font-weight: 700; font-family: monospace;">รหัสพัสดุ: ${item.code}</div>
                        <div style="font-size: 15px; font-weight: 700; color: var(--text-primary); margin: 2px 0;">
                            📌 ${item.name}${noticeHtml}
                        </div>
                        <div style="font-size: 13px; color: var(--text-secondary);">
                            คงเหลือจริง(storage location 2601): <strong style="color: var(--text-primary);">${item.currentQty} ${item.unit}</strong> | 
                            เกณฑ์มาตรฐาน: <strong>${item.standard} ${item.unit}</strong> | 
                            สัดส่วน: <strong style="color: ${colorCode}">${status.pct}%</strong>
                        </div>
                    </div>
                </div>
                <div>
                    <span class="badge ${status.badgeClass}" style="font-size: 13px; padding: 6px 14px;">${status.label}</span>
                </div>
            </div>
        `;
    }

    renderSettingsPage() {
        const hasAuditPerm = this.db.getAuditPermission();
        const permStatusBadge = document.getElementById("permStatusBadge");
        const permToggleBtn = document.getElementById("permToggleBtn");

        if (permStatusBadge && permToggleBtn) {
            if (hasAuditPerm) {
                permStatusBadge.className = "badge badge-success";
                permStatusBadge.textContent = "🟢 อนุญาตใช้งานสิทธิ์ตรวจนับ (Granted)";
                permToggleBtn.className = "btn btn-danger";
                permToggleBtn.textContent = "🚫 ยกเลิกสิทธิ์การปรับยอดตรวจนับ (Revoke Permission)";
            } else {
                permStatusBadge.className = "badge badge-danger";
                permStatusBadge.textContent = "🔴 ปิด/ยกเลิกสิทธิ์ปรับยอดตรวจนับ (Revoked)";
                permToggleBtn.className = "btn btn-success";
                permToggleBtn.textContent = "✅ อนุมัติอนุญาตสิทธิ์ตรวจนับ (Grant Permission)";
            }
        }

        this.renderRequestersManagementTable();
    }

    renderRequestersManagementTable() {
        const requestersContainer = document.getElementById("requestersListContainer");
        if (!requestersContainer) return;

        const list = this.db.getRequesters();
        const countBadge = document.getElementById("requestersCountBadge");
        if (countBadge) countBadge.textContent = `${list.length} ท่าน`;

        if (list.length === 0) {
            requestersContainer.innerHTML = `<div style="color: var(--text-muted); text-align: center; padding: 16px;">ยังไม่มีรายชื่อผู้เบิกในระบบ</div>`;
            return;
        }

        requestersContainer.innerHTML = list.map((name, index) => `
            <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 12px; color: var(--accent-primary); font-weight: 700;">${index + 1}.</span>
                    <span style="font-weight: 600; font-size: 14px;">${name}</span>
                </div>
                <button class="btn btn-outline" style="padding: 2px 8px; font-size: 12px; color: var(--danger); border-color: rgba(239, 68, 68, 0.4);" onclick="app.handleDeleteRequester('${name}')">
                    🗑️ ลบ
                </button>
            </div>
        `).join("");

        this.updateRequestersDatalist();
    }

    authenticateRequestersManagement(actionText = "ทำรายการนี้") {
        const inputPin = prompt(`🔐 [สิทธิ์เฉพาะเจ้าของระบบในการจัดการผู้เบิก]\n\nกรุณากรอกรหัสผ่านเพื่อ${actionText}:`, "");
        if (inputPin === null) return false;

        if (this.db.verifyRequestersPin(inputPin)) {
            this.audio.playScanSuccess();
            return true;
        } else {
            this.audio.playError();
            alert("❌ รหัสผ่านไม่ถูกต้อง! ไม่อนุญาตให้เพิ่มหรือลบรายชื่อผู้เบิก");
            return false;
        }
    }

    handleAddRequester() {
        const input = document.getElementById("newRequesterInput");
        if (!input) return;
        const name = input.value.trim();

        if (!name) {
            alert("กรุณากรอกชื่อผู้เบิก");
            return;
        }

        if (!this.authenticateRequestersManagement(`เพิ่มรายชื่อผู้เบิก [${name}]`)) {
            return;
        }

        try {
            this.db.addRequester(name);
            input.value = "";
            this.renderRequestersManagementTable();
            alert(`✅ เพิ่มรายชื่อผู้เบิก [${name}] สำเร็จแล้ว`);
        } catch (err) {
            this.audio.playError();
            alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
        }
    }

    handleDeleteRequester(name) {
        if (!this.authenticateRequestersManagement(`ลบรายชื่อผู้เบิก [${name}]`)) {
            return;
        }

        if (confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบรายชื่อผู้เบิก [${name}] ออกจากระบบ?`)) {
            this.db.deleteRequester(name);
            this.renderRequestersManagementTable();
            alert(`✅ ลบรายชื่อผู้เบิก [${name}] สำเร็จแล้ว`);
        }
    }

    toggleAuditPermission() {
        const currentPerm = this.db.getAuditPermission();
        const newPerm = !currentPerm;
        
        const actionText = newPerm ? "อนุมัติเปิดใช้งาน" : "ยกเลิกสิทธิ์";
        if (confirm(`🔐 เจ้าของระบบ: คุณต้องการ [${actionText}] สิทธิ์การปรับยอดจากการตรวจนับพัสดุ ใช่หรือไม่?`)) {
            this.db.setAuditPermission(newPerm);
            this.audio.playScanSuccess();
            alert(`✅ ดำเนินการ [${actionText}] สิทธิ์ปรับยอดจากการตรวจนับเรียบร้อยแล้ว`);
            this.renderSettingsPage();
        }
    }

    openTransactionModalByCode(code, type = "dispense") {
        const item = this.db.getItemByCode(code);
        if (item) {
            this.openTransactionModal(item, type);
        }
    }

    openImageViewerModal(src, caption) {
        const modal = document.getElementById("imageViewerModal");
        const img = document.getElementById("imageViewerImg");
        const cap = document.getElementById("imageViewerCaption");

        if (modal && img && cap) {
            img.src = src;
            cap.textContent = caption || "";
            modal.classList.add("active");
        }
    }

    closeImageViewerModal() {
        const modal = document.getElementById("imageViewerModal");
        if (modal) modal.classList.remove("active");
    }

    triggerItemPhotoUpload() {
        const fileInput = document.getElementById("itemFileInput");
        if (fileInput) {
            fileInput.value = "";
            fileInput.click();
        }
    }


    async handleResetSingleItemPhoto() {
        if (!this.selectedItemForModal) return;
        const itemCode = this.selectedItemForModal.code;

        if (confirm(`🔄 คุณต้องการรีเซตรูปภาพของพัสดุ [${this.selectedItemForModal.name}] กลับเป็นรูปภาพหลักเริ่มต้นใช่หรือไม่?`)) {
            const updated = await this.db.resetItemImage(itemCode);
            this.selectedItemForModal = updated;
            this.audio.playScanSuccess();
            alert(`✅ รีเซตรูปภาพพัสดุ [${updated.name}] กลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว`);

            this.closeImageViewerModal();
            this.openTransactionModal(updated, document.getElementById("txType")?.value || "dispense");
            if (this.activeTab === "dashboard") this.renderDashboard();
            if (this.activeTab === "stock") this.renderStockTable();
            if (this.activeTab === "alerts") this.renderAlertsPage();
        }
    }

    async resetAllItemPhotos() {
        if (!this.authenticateOwner("รีเซตรูปภาพพัสดุทั้งหมดกลับเป็นค่าเริ่มต้น")) {
            return;
        }

        if (confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการรีเซตรูปภาพพัสดุทั้งหมดในระบบกลับเป็นรูปภาพหลักเริ่มต้น?")) {
            await this.db.resetAllItemImages();
            this.audio.playScanSuccess();
            alert("✅ รีเซตรูปภาพพัสดุทั้งหมดกลับเป็นค่าเริ่มต้นเรียบร้อยแล้ว");

            if (this.activeTab === "dashboard") this.renderDashboard();
            if (this.activeTab === "stock") this.renderStockTable();
            if (this.activeTab === "alerts") this.renderAlertsPage();
        }
    }

    renderStockTable(searchQuery = "") {
        const items = this.db.getItems();
        const tbody = document.getElementById("stockTbody");
        if (!tbody) return;

        const filtered = items.filter(i => {
            const q = searchQuery.toLowerCase();
            return i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q));
        });

        const sorted = this.sortItems(filtered);

        tbody.innerHTML = sorted.map((item, index) => {
            const status = window.getItemStatus(item.currentQty, item.standard);
            const noticeHtml = this.getItemNoticeHtml(item);
            const thumbHtml = this.renderItemThumbnailHtml(item);
            const rowNum = this.sortField ? (index + 1) : this.getOriginalIndex(item);

            return `
                <tr onclick="app.openTransactionModalByCode('${item.code}', 'dispense')" style="cursor: pointer;">
                    <td style="font-weight: 700; color: var(--accent-primary); text-align: center;">${rowNum}</td>
                    <td>${thumbHtml}</td>
                    <td><code style="font-family: monospace; color: var(--accent-primary); font-weight: 600;">${item.code}</code></td>
                    <td>
                        <div style="font-weight: 600;">
                            ${item.name}${noticeHtml}
                        </div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${item.category || 'พัสดุทั่วไป'}</div>
                    </td>
                    <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
                    <td style="background: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; font-weight: 700; text-align: center; border-left: 1px dashed rgba(16, 185, 129, 0.3); border-right: 1px dashed rgba(16, 185, 129, 0.3);">${item.standard} ${item.unit}</td>
                    <td style="font-size: 16px; font-weight: 700;">${item.currentQty} <span style="font-size: 12px; color: var(--text-secondary);">${item.unit}</span></td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.mb52Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.wmsQty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation()">${this.renderWmsVsMb52Cell(item)}</td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);" title="คลิกเพื่อปรับยอด MB52 / WMS / sloc 0023 (เฉพาะ Owner)">${item.kk23Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td>${this.renderLocationComparisonCell(item)}</td>
                    <td style="font-weight: 700;">${status.pct}%</td>
                    <td onclick="event.stopPropagation()">
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="app.openTransactionModalByCode('${item.code}', 'dispense')">
                                📤 เบิก
                            </button>
                            <button class="btn btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="app.openTransactionModalByCode('${item.code}', 'receive')">
                                📥 เติม
                            </button>
                            <button class="btn btn-outline" style="padding: 4px 6px; font-size: 11px;" onclick="app.openLocationEditModal('${item.code}')" title="ปรับยอด 3 คลัง (เฉพาะ Owner)">
                                ✏️ คลัง
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    renderAlertsPage() {
        const items = this.db.getItems();
        const alertItems = items.filter(i => {
            const status = window.getItemStatus(i.currentQty, i.standard);
            return status.key === "out_of_stock" || status.key === "low";
        });
        
        const sorted = this.sortItems(alertItems);
        const tbody = document.getElementById("alertsTbody");
        if (!tbody) return;

        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="14" style="text-align: center; color: var(--success); font-weight: 600; padding: 32px;">🎉 ไม่มีพัสดุที่ต้องจัดซื้อ/เติม ยอดคงคลังอยู่ในระดับผ่านเกณฑ์มาตรฐานทุกรายการ</td></tr>`;
            return;
        }

        tbody.innerHTML = sorted.map((item, index) => {
            const current = Number(item.currentQty);
            const std = Number(item.standard);
            const deficit = std - current;
            const status = window.getItemStatus(current, std);
            const noticeHtml = this.getItemNoticeHtml(item);
            const thumbHtml = this.renderItemThumbnailHtml(item);
            const rowNum = this.sortField ? (index + 1) : this.getOriginalIndex(item);

            return `
                <tr onclick="app.openTransactionModalByCode('${item.code}', 'dispense')" style="cursor: pointer;">
                    <td style="font-weight: 700; color: var(--accent-primary); text-align: center;">${rowNum}</td>
                    <td>${thumbHtml}</td>
                    <td><code style="font-family: monospace; color: var(--accent-primary);">${item.code}</code></td>
                    <td style="font-weight: 600;">
                        ${item.name}${noticeHtml}
                    </td>
                    <td><span class="badge ${status.badgeClass}">${status.label}</span></td>
                    <td style="background: rgba(16, 185, 129, 0.15) !important; color: #34d399 !important; font-weight: 700; text-align: center; border-left: 1px dashed rgba(16, 185, 129, 0.3); border-right: 1px dashed rgba(16, 185, 129, 0.3);">${std} ${item.unit}</td>
                    <td style="font-weight: 700; color: ${status.key==='out_of_stock'?'#ef4444':'#f97316'};">${current} ${item.unit}</td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);">${item.mb52Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);">${item.wmsQty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation()">${this.renderWmsVsMb52Cell(item)}</td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);">${item.kk23Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td>${this.renderLocationComparisonCell(item)}</td>
                    <td style="font-weight: 700; color: #f97316;">${status.pct}% (ขาดอีก ${deficit} ${item.unit})</td>
                    <td onclick="event.stopPropagation()">
                        <div style="display: flex; gap: 4px;">
                            <button class="btn btn-success" style="padding: 4px 8px; font-size: 12px;" onclick="app.openTransactionModalByCode('${item.code}', 'receive')">
                                📥 สั่งเติม
                            </button>
                            <button class="btn btn-outline" style="padding: 4px 6px; font-size: 11px;" onclick="app.openLocationEditModal('${item.code}')" title="ปรับยอด 3 คลัง (เฉพาะ Owner)">
                                ✏️ คลัง
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join("");
    }

    setCompFilter(filterType) {
        this.compFilter = filterType;
        document.querySelectorAll("#compFilterAll, #compFilterDiff, #compFilterEqual, #compFilterWmsOver, #compFilterWmsUnder").forEach(btn => btn?.classList.remove("active"));
        
        if (filterType === 'all') document.getElementById("compFilterAll")?.classList.add("active");
        if (filterType === 'diff') document.getElementById("compFilterDiff")?.classList.add("active");
        if (filterType === 'equal') document.getElementById("compFilterEqual")?.classList.add("active");
        if (filterType === 'wms_over') document.getElementById("compFilterWmsOver")?.classList.add("active");
        if (filterType === 'wms_under') document.getElementById("compFilterWmsUnder")?.classList.add("active");

        this.renderComparisonTable();
    }

    renderComparisonTable() {
        const items = this.db.getItems();
        const tbody = document.getElementById("comparisonTbody");
        if (!tbody) return;

        // KPI Counts
        let equalCount = 0;
        let wmsOverCount = 0;
        let wmsUnderCount = 0;

        items.forEach(i => {
            const w = Number(i.wmsQty || 0);
            const m = Number(i.mb52Qty || 0);
            if (w === m) equalCount++;
            else if (w > m) wmsOverCount++;
            else wmsUnderCount++;
        });

        const elTotal = document.getElementById("compStatTotalSKU");
        if (elTotal) elTotal.textContent = items.length;
        const elEq = document.getElementById("compStatEqualCount");
        if (elEq) elEq.textContent = equalCount;
        const elOver = document.getElementById("compStatWmsOverCount");
        if (elOver) elOver.textContent = wmsOverCount;
        const elUnder = document.getElementById("compStatWmsUnderCount");
        if (elUnder) elUnder.textContent = wmsUnderCount;

        const q = (document.getElementById("compSearchInput")?.value || "").toLowerCase();
        
        let filtered = items.filter(i => {
            const matchSearch = i.code.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
            if (!matchSearch) return false;

            const w = Number(i.wmsQty || 0);
            const m = Number(i.mb52Qty || 0);

            if (this.compFilter === 'equal') return w === m;
            if (this.compFilter === 'wms_over') return w > m;
            if (this.compFilter === 'wms_under') return w < m;
            if (this.compFilter === 'diff') return w !== m;
            return true;
        });

        const sorted = this.sortItems(filtered);

        if (sorted.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; color: var(--success); font-weight: 600; padding: 32px;">🎉 ไม่พบรายการเปรียบเทียบในหมวดหมู่ที่เลือก</td></tr>`;
            return;
        }

        tbody.innerHTML = sorted.map((item, index) => {
            const noticeHtml = this.getItemNoticeHtml(item);
            const thumbHtml = this.renderItemThumbnailHtml(item);
            const compHtml = this.renderLocationComparisonCell(item);
            const wmsMbCell = this.renderWmsVsMb52Cell(item);
            const rowNum = this.sortField ? (index + 1) : this.getOriginalIndex(item);

            return `
                <tr onclick="app.openTransactionModalByCode('${item.code}', 'dispense')" style="cursor: pointer;">
                    <td style="font-weight: 700; color: var(--accent-primary); text-align: center;">${rowNum}</td>
                    <td>${thumbHtml}</td>
                    <td><code style="font-family: monospace; color: var(--accent-primary); font-weight: 600;">${item.code}</code></td>
                    <td style="font-weight: 500;">
                        ${item.name}${noticeHtml}
                    </td>
                    <td style="font-weight: 700;">${item.currentQty} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit}</span></td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: #9333ea; background: rgba(147, 51, 234, 0.05);" title="คลิกเพื่อปรับยอด MB52">${item.mb52Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: #2563eb; background: rgba(59, 130, 246, 0.05);" title="คลิกเพื่อปรับยอด WMS">${item.wmsQty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td onclick="event.stopPropagation()">${wmsMbCell}</td>
                    <td onclick="event.stopPropagation(); app.openLocationEditModal('${item.code}')" style="font-weight: 600; cursor: pointer; color: var(--accent-primary);">${item.kk23Qty || 0} <span style="font-size: 11px; color: var(--text-secondary);">${item.unit} ✏️</span></td>
                    <td>${compHtml}</td>
                    <td onclick="event.stopPropagation()">
                        <button class="btn btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="app.openLocationEditModal('${item.code}')" title="ปรับยอด 3 คลัง (เฉพาะ Owner)">
                            ✏️ ปรับยอด
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    exportWmsMb52ComparisonReport() {
        const items = this.db.getItems();
        if (items.length === 0) {
            alert("ไม่มีรายการพัสดุสำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH");
        
        let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>เปรียบเทียบ WMS vs MB52</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Sarabun', Tahoma, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th {
    background-color: #dbeafe; /* โทนสีฟ้าอ่อน */
    color: #1e40af;
    font-weight: bold;
    border: 1px solid #93c5fd;
    padding: 10px 14px;
    text-align: center;
    font-size: 13px;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    font-size: 12px;
    vertical-align: middle;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .text-code { mso-number-format:"\\@"; text-align: center; font-family: monospace; font-weight: bold; }
</style>
</head>
<body>
<h3 style="color: #1e40af;">⚖️ รายงานตารางเปรียบเทียบยอดคงเหลือ WMS และ MB52 (ผปบ.กฟส.ขก.2) - ${dateFormatted}</h3>
<table>
  <thead>
    <tr>
      <th>ลำดับ</th>
      <th>รหัสพัสดุ</th>
      <th>รายการพัสดุ</th>
      <th>คงเหลือจริง (sloc 2601)</th>
      <th>คงเหลือใน MB52</th>
      <th>คงเหลือใน WMS</th>
      <th>ส่วนต่าง (WMS - MB52)</th>
      <th>สถานะการเปรียบเทียบ</th>
      <th>คลังกฟจ.ขอนแก่น (sloc 0023)</th>
      <th>หน่วยนับ</th>
    </tr>
  </thead>
  <tbody>
`;

        items.forEach((i) => {
            const origIdx = this.getOriginalIndex(i);
            const q2601 = Number(i.currentQty || 0);
            const mb = Number(i.mb52Qty || 0);
            const wm = Number(i.wmsQty || 0);
            const diff = wm - mb;

            let diffText = "0 (เท่ากัน)";
            let statusLabel = "🟢 ยอด WMS เท่ากับ MB52";
            let textColor = "#059669";
            let bgColor = "#ecfdf5";

            if (diff > 0) {
                diffText = `+${diff}`;
                statusLabel = `🔵 WMS มากกว่า MB52 (+${diff})`;
                textColor = "#2563eb";
                bgColor = "#eff6ff";
            } else if (diff < 0) {
                diffText = `${diff}`;
                statusLabel = `🔴 WMS น้อยกว่า MB52 (${diff})`;
                textColor = "#dc2626";
                bgColor = "#fef2f2";
            }

            html += `
    <tr>
      <td class="center" style="font-weight: bold;">${origIdx}</td>
      <td class="text-code">${i.code}</td>
      <td>${i.name}</td>
      <td class="right" style="font-weight: bold;">${q2601}</td>
      <td class="right" style="background-color: #faf5ff;">${mb}</td>
      <td class="right" style="background-color: #eff6ff;">${wm}</td>
      <td class="right" style="font-weight: bold; color: ${textColor};">${diffText}</td>
      <td class="center" style="color: ${textColor}; background-color: ${bgColor}; font-weight: bold;">${statusLabel}</td>
      <td class="right">${i.kk23Qty || 0}</td>
      <td class="center">${i.unit}</td>
    </tr>`;
        });

        html += `
  </tbody>
</table>
</body>
</html>`;

        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `รายงานเปรียบเทียบ_WMS_vs_MB52_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    renderHistoryTable() {
        const logs = this.db.getLogs();
        const tbody = document.getElementById("historyTbody");
        if (!tbody) return;

        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">ยังไม่มีประวัติการทำรายการ</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(log => {
            const dateStr = new Date(log.timestamp).toLocaleString("th-TH");
            let typeBadge = `<span class="badge badge-info">📤 เบิกจ่าย</span>`;
            if (log.type === "receive" || log.type === "in") typeBadge = `<span class="badge badge-success">📥 รับเข้า</span>`;
            if (log.type === "audit" || log.type === "count") typeBadge = `<span class="badge badge-orange">📋 ตรวจนับ</span>`;
            if (log.type === "out" || log.type === "dispense" || log.type === "withdraw") typeBadge = `<span class="badge badge-danger">🔴 เบิกจ่าย</span>`;
            if (log.type === "import") typeBadge = `<span class="badge badge-primary">📥 นำเข้าพัสดุ</span>`;

            const item = this.db.getItemByCode(log.code);
            const noticeHtml = this.getItemNoticeHtml(item, "10px");

            return `
                <tr>
                    <td style="font-size: 12px; color: var(--text-secondary);">${dateStr}</td>
                    <td>${typeBadge}</td>
                    <td><code style="font-family: monospace; color: var(--accent-primary);">${log.code}</code></td>
                    <td style="font-weight: 500;">${log.name}${noticeHtml}</td>
                    <td style="font-weight: 700;">${log.qty} ${log.unit}</td>
                    <td style="color: var(--text-secondary);">${log.balanceAfter} ${log.unit}</td>
                    <td style="font-size: 13px;">${log.requester}</td>
                    <td style="font-size: 13px; color: var(--text-secondary);">${log.workOrder} ${log.note ? `(${log.note})` : ''}</td>
                </tr>
            `;
        }).join("");
    }

    printHistoryLog() {
        const logs = this.db.getLogs();
        if (logs.length === 0) {
            alert("⚠️ ยังไม่มีประวัติการทำรายการสำหรับพิมพ์");
            return;
        }
        this.switchTab("history");
        setTimeout(() => {
            window.print();
        }, 300);
    }

    exportHistoryLogToExcel() {
        const logs = this.db.getLogs();
        if (logs.length === 0) {
            alert("⚠️ ยังไม่มีประวัติการทำรายการสำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH");
        
        let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>ประวัติการเบิกจ่ายและรับพัสดุ</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Sarabun', Tahoma, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th {
    background-color: #f3e8ff;
    color: #581c87;
    font-weight: bold;
    border: 1px solid #d8b4fe;
    padding: 10px 14px;
    text-align: center;
    font-size: 13px;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    font-size: 12px;
    vertical-align: middle;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .text-code { mso-number-format:"\\@"; text-align: center; font-family: monospace; font-weight: bold; }
</style>
</head>
<body>
<h3 style="color: #581c87;">📜 รายงานประวัติการเบิกจ่าย รับเข้า และตรวจนับพัสดุทั้งหมด (ผปบ.กฟส.ขก.2) - ${dateFormatted}</h3>
<table>
  <thead>
    <tr>
      <th>ลำดับ</th>
      <th>วัน-เวลา</th>
      <th>ประเภทรายการ</th>
      <th>รหัสพัสดุ</th>
      <th>รายการพัสดุ</th>
      <th>จำนวน</th>
      <th>คงเหลือหลังทำรายการ</th>
      <th>ผู้เบิก/ผู้ทำรายการ</th>
      <th>ใบสั่งงาน / หมายเหตุ</th>
    </tr>
  </thead>
  <tbody>
`;

        logs.forEach((log, idx) => {
            const item = this.db.getItemByCode(log.code);
            const itemName = item ? item.name : log.name || log.code;
            const unit = item ? item.unit : log.unit || "ชิ้น";
            
            let typeLabel = "เบิกจ่าย";
            let typeColor = "#ef4444";
            if (log.type === "receive") {
                typeLabel = "เติมสต็อก";
                typeColor = "#10b981";
            } else if (log.type === "audit") {
                typeLabel = "ปรับยอดตรวจนับ";
                typeColor = "#3b82f6";
            }

            const timestampFormatted = new Date(log.timestamp).toLocaleString("th-TH");
            const workNote = [log.workOrder ? `WO: ${log.workOrder}` : "", log.note].filter(Boolean).join(" | ") || "-";

            html += `
    <tr>
      <td class="center" style="font-weight: bold;">${idx + 1}</td>
      <td class="center">${timestampFormatted}</td>
      <td class="center" style="font-weight: bold; color: ${typeColor};">${typeLabel}</td>
      <td class="text-code">${log.code}</td>
      <td>${itemName}</td>
      <td class="right" style="font-weight: bold;">${log.qty} ${unit}</td>
      <td class="right" style="font-weight: bold;">${log.balanceAfter !== undefined ? log.balanceAfter : (log.afterQty || 0)} ${unit}</td>
      <td class="center">${log.requester || "-"}</td>
      <td>${workNote}</td>
    </tr>`;
        });

        html += `
  </tbody>
</table>
</body>
</html>`;

        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `ประวัติการเบิกจ่ายและรับพัสดุ_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    renderBarcodeLabels() {
        const items = this.db.getItems();
        const container = document.getElementById("barcodeLabelsContainer");
        if (!container) return;

        container.innerHTML = items.map((item, idx) => {
            const notice = this.getItemNotice(item);
            const noticeHtml = notice ? `<div style="font-size: 11px; color: #f97316; font-weight: 700; margin-top: 2px;">⚠️ ${notice}</div>` : "";

            return `
                <div class="barcode-label-item">
                    <div style="font-size: 11px; font-weight: 700; color: #3b82f6;">ลำดับที่ ${idx + 1}</div>
                    <h4>${item.name}</h4>
                    ${noticeHtml}
                    <svg id="barcode-svg-${item.code}"></svg>
                    <div style="font-family: monospace; font-size: 13px; font-weight: 700; margin-top: 4px;">${item.code}</div>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">มาตรฐาน: ${item.standard} ${item.unit}</div>
                </div>
            `;
        }).join("");

        items.forEach(item => {
            const svgEl = document.getElementById(`barcode-svg-${item.code}`);
            if (svgEl && typeof JsBarcode !== "undefined") {
                try {
                    JsBarcode(svgEl, item.code, {
                        format: "CODE128",
                        width: 1.5,
                        height: 40,
                        displayValue: false
                    });
                } catch(e) {}
            }
        });
    }

    exportReorderReport() {
        const items = this.db.getItems();
        const alertItems = items.filter(i => {
            const status = window.getItemStatus(i.currentQty, i.standard);
            return status.key === "out_of_stock" || status.key === "low";
        });
        
        if (alertItems.length === 0) {
            alert("ไม่มีรายการต้องจัดซื้อ/เติม สำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH");
        
        let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>รายงานพัสดุ</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Sarabun', Tahoma, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th {
    background-color: #e9d5ff; /* โทนสีม่วงอ่อน (Light Purple) */
    color: #4c1d95; /* ตัวอักษรสีม่วงเข้ม */
    font-weight: bold;
    border: 1px solid #c084fc;
    padding: 10px 14px;
    text-align: center;
    font-size: 13px;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    font-size: 12px;
    vertical-align: middle;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .text-code { mso-number-format:"\\@"; text-align: center; font-family: monospace; font-weight: bold; }
</style>
</head>
<body>
<h3 style="color: #4c1d95;">⚡ รายงานพัสดุต้องจัดซื้อ/จัดหา และพัสดุเตือน (ผปบ.กฟส.ขก.2) - ${dateFormatted}</h3>
<table>
  <thead>
    <tr>
      <th>ลำดับ</th>
      <th>รหัสพัสดุ</th>
      <th>รายการ</th>
      <th>หมายเหตุเฉพาะ</th>
      <th>สถานะ</th>
      <th>% คงเหลือ</th>
      <th>ยอดมาตรฐาน</th>
      <th>คงเหลือจริง(storage location 2601)</th>
      <th>คงเหลือใน MB52</th>
      <th>คงเหลือใน WMS</th>
      <th>ส่วนต่าง (WMS - MB52)</th>
      <th>คลังกฟจ.ขอนแก่น (sloc 0023)</th>
      <th>ผลเปรียบเทียบยอดคลัง</th>
      <th>ขาดอยู่ (ต้องสั่งเพิ่ม)</th>
      <th>หน่วยนับ</th>
    </tr>
  </thead>
  <tbody>
`;

        alertItems.forEach((i) => {
            const deficit = Number(i.standard) - Number(i.currentQty);
            const status = window.getItemStatus(i.currentQty, i.standard);
            const notice = this.getItemNotice(i) || "-";
            const origIdx = this.getOriginalIndex(i);

            const q2601 = Number(i.currentQty || 0);
            const mb = Number(i.mb52Qty || 0);
            const wm = Number(i.wmsQty || 0);
            const kk = Number(i.kk23Qty || 0);
            const wmsMbDiff = wm - mb;
            const wmsMbText = wmsMbDiff === 0 ? "0 (เท่ากัน)" : (wmsMbDiff > 0 ? `+${wmsMbDiff} (WMS มากกว่า)` : `${wmsMbDiff} (WMS น้อยกว่า)`);

            const isEqual = (q2601 === mb && q2601 === wm && q2601 === kk);
            let compText = "🟢 ยอดตรงกันทุกคลัง (=)";
            if (!isEqual) {
                const f = (val, base, label) => {
                    const d = val - base;
                    if (d === 0) return `${label}: เท่ากัน(=)`;
                    if (d > 0) return `${label}: มากกว่า(+${d})`;
                    return `${label}: น้อยกว่า(${d})`;
                };
                compText = `${f(mb, q2601, 'MB52')} | ${f(wm, q2601, 'WMS')} | ${f(kk, q2601, 'คลัง0023')}`;
            }

            let statusLabel = "";
            let statusTextColor = "#1e293b";
            let statusBgColor = "#ffffff";

            if (status.key === "out_of_stock") {
                statusLabel = "🔴 จัดซื้อ/จัดหา (Min. Stock)";
                statusTextColor = "#dc2626";
                statusBgColor = "#fef2f2";
            } else if (status.key === "low") {
                statusLabel = "🟧 เตือน (50-60% Warning)";
                statusTextColor = "#ea580c";
                statusBgColor = "#fff7ed";
            } else if (status.key === "normal") {
                statusLabel = "🟡 พอดี (61-80% Fair)";
                statusTextColor = "#65a30d";
                statusBgColor = "#f7fee7";
            } else if (status.key === "good") {
                statusLabel = "🟢 ดี (81-99% Good)";
                statusTextColor = "#059669";
                statusBgColor = "#ecfdf5";
            } else if (status.key === "full") {
                statusLabel = "❇️ เต็ม 100% (100% Full)";
                statusTextColor = "#047857";
                statusBgColor = "#e6fffa";
            } else if (status.key === "over") {
                statusLabel = "🔵 เกิน 100% (Over Stock >100%)";
                statusTextColor = "#2563eb";
                statusBgColor = "#eff6ff";
            }

            html += `
    <tr>
      <td class="center" style="font-weight: bold;">${origIdx}</td>
      <td class="text-code">${i.code}</td>
      <td>${i.name}</td>
      <td class="center">${notice}</td>
      <td class="center" style="color: ${statusTextColor}; background-color: ${statusBgColor}; font-weight: bold;">${statusLabel}</td>
      <td class="center" style="font-weight: bold; color: ${statusTextColor};">${status.pct}%</td>
      <td class="right">${i.standard}</td>
      <td class="right" style="font-weight: bold;">${i.currentQty}</td>
      <td class="right">${i.mb52Qty || 0}</td>
      <td class="right">${i.wmsQty || 0}</td>
      <td class="center" style="font-weight: bold; color: ${wmsMbDiff === 0 ? '#10b981' : (wmsMbDiff > 0 ? '#2563eb' : '#dc2626')};">${wmsMbText}</td>
      <td class="right">${i.kk23Qty || 0}</td>
      <td class="center" style="font-size: 11px;">${compText}</td>
      <td class="right" style="font-weight: bold; color: #dc2626;">${deficit}</td>
      <td class="center">${i.unit}</td>
    </tr>`;
        });

        html += `
  </tbody>
</table>
</body>
</html>`;

        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `รายงานพัสดุต้องจัดหา_เตือน_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    exportAllItemsReport() {
        const items = this.db.getItems();
        if (items.length === 0) {
            alert("ไม่มีรายการพัสดุสำหรับส่งออก");
            return;
        }

        const dateFormatted = new Date().toLocaleDateString("th-TH");
        
        let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<!--[if gte mso 9]>
<xml>
<x:ExcelWorkbook>
<x:ExcelWorksheets>
<x:ExcelWorksheet>
<x:Name>รายงานพัสดุทั้งหมด</x:Name>
<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
</x:ExcelWorksheet>
</x:ExcelWorksheets>
</x:ExcelWorkbook>
</xml>
<![endif]-->
<style>
  body { font-family: 'Sarabun', Tahoma, sans-serif; }
  table { border-collapse: collapse; width: 100%; }
  th {
    background-color: #e9d5ff; /* โทนสีม่วงอ่อน (Light Purple) */
    color: #4c1d95; /* ตัวอักษรสีม่วงเข้ม */
    font-weight: bold;
    border: 1px solid #c084fc;
    padding: 10px 14px;
    text-align: center;
    font-size: 13px;
  }
  td {
    border: 1px solid #cbd5e1;
    padding: 8px 12px;
    font-size: 12px;
    vertical-align: middle;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .text-code { mso-number-format:"\\@"; text-align: center; font-family: monospace; font-weight: bold; }
</style>
</head>
<body>
<h3 style="color: #4c1d95;">📦 รายงานข้อมูลพัสดุทั้งหมดในระบบ (ผปบ.กฟส.ขก.2) - ${dateFormatted}</h3>
<table>
  <thead>
    <tr>
      <th>ลำดับ</th>
      <th>รหัสพัสดุ</th>
      <th>รายการ</th>
      <th>หมายเหตุเฉพาะ</th>
      <th>สถานะ</th>
      <th>% คงเหลือ</th>
      <th style="background-color: #d9f99d !important; color: #365314 !important; font-weight: bold; border: 1px solid #a3e635;">ยอดมาตรฐาน</th>
      <th>คงเหลือจริง(storage location 2601)</th>
      <th>คงเหลือใน MB52</th>
      <th>คงเหลือใน WMS</th>
      <th>ส่วนต่าง (WMS - MB52)</th>
      <th>คลังกฟจ.ขอนแก่น (sloc 0023)</th>
      <th>ผลเปรียบเทียบยอดคลัง</th>
      <th>ขาดอยู่ (ต้องสั่งเพิ่ม)</th>
      <th>หน่วยนับ</th>
    </tr>
  </thead>
  <tbody>
`;

        items.forEach((i, idx) => {
            const std = Number(i.standard);
            const current = Number(i.currentQty);
            const deficit = std > current ? std - current : 0;
            const status = window.getItemStatus(current, std);
            const notice = this.getItemNotice(i) || "-";
            const origIdx = this.getOriginalIndex(i);

            const q2601 = Number(i.currentQty || 0);
            const mb = Number(i.mb52Qty || 0);
            const wm = Number(i.wmsQty || 0);
            const kk = Number(i.kk23Qty || 0);
            const wmsMbDiff = wm - mb;
            const wmsMbText = wmsMbDiff === 0 ? "0 (เท่ากัน)" : (wmsMbDiff > 0 ? `+${wmsMbDiff} (WMS มากกว่า)` : `${wmsMbDiff} (WMS น้อยกว่า)`);

            const isEqual = (q2601 === mb && q2601 === wm && q2601 === kk);
            let compText = "🟢 ยอดตรงกันทุกคลัง (=)";
            if (!isEqual) {
                const f = (val, base, label) => {
                    const d = val - base;
                    if (d === 0) return `${label}: เท่ากัน(=)`;
                    if (d > 0) return `${label}: มากกว่า(+${d})`;
                    return `${label}: น้อยกว่า(${d})`;
                };
                compText = `${f(mb, q2601, 'MB52')} | ${f(wm, q2601, 'WMS')} | ${f(kk, q2601, 'คลัง0023')}`;
            }

            let statusLabel = "";
            let statusTextColor = "#1e293b";
            let statusBgColor = "#ffffff";

            if (status.key === "out_of_stock") {
                statusLabel = "🔴 จัดซื้อ/จัดหา (Min. Stock)";
                statusTextColor = "#dc2626";
                statusBgColor = "#fef2f2";
            } else if (status.key === "low") {
                statusLabel = "🟧 เตือน (50-60% Warning)";
                statusTextColor = "#ea580c";
                statusBgColor = "#fff7ed";
            } else if (status.key === "normal") {
                statusLabel = "🟡 พอดี (61-80% Fair)";
                statusTextColor = "#65a30d";
                statusBgColor = "#f7fee7";
            } else if (status.key === "good") {
                statusLabel = "🟢 ดี (81-99% Good)";
                statusTextColor = "#059669";
                statusBgColor = "#ecfdf5";
            } else if (status.key === "full") {
                statusLabel = "❇️ เต็ม 100% (100% Full)";
                statusTextColor = "#047857";
                statusBgColor = "#e6fffa";
            } else if (status.key === "over") {
                statusLabel = "🔵 เกิน 100% (Over Stock >100%)";
                statusTextColor = "#2563eb";
                statusBgColor = "#eff6ff";
            }

            html += `
    <tr>
      <td class="center" style="font-weight: bold;">${origIdx}</td>
      <td class="text-code">${i.code}</td>
      <td>${i.name}</td>
      <td class="center">${notice}</td>
      <td class="center" style="color: ${statusTextColor}; background-color: ${statusBgColor}; font-weight: bold;">${statusLabel}</td>
      <td class="center" style="font-weight: bold; color: ${statusTextColor};">${status.pct}%</td>
      <td class="right" style="background-color: #f7fee7 !important; color: #365314 !important; font-weight: bold; mso-number-format:'\\#\\,\\#\\#0';">${i.standard}</td>
      <td class="right" style="font-weight: bold;">${i.currentQty}</td>
      <td class="right">${i.mb52Qty || 0}</td>
      <td class="right">${i.wmsQty || 0}</td>
      <td class="center" style="font-weight: bold; color: ${wmsMbDiff === 0 ? '#10b981' : (wmsMbDiff > 0 ? '#2563eb' : '#dc2626')};">${wmsMbText}</td>
      <td class="right">${i.kk23Qty || 0}</td>
      <td class="center" style="font-size: 11px;">${compText}</td>
      <td class="right" style="font-weight: bold; color: ${deficit > 0 ? '#dc2626' : '#10b981'};">${deficit}</td>
      <td class="center">${i.unit}</td>
    </tr>`;
        });

        html += `
  </tbody>
</table>
</body>
</html>`;

        const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `รายงานพัสดุทั้งหมด_${new Date().toISOString().slice(0, 10)}.xls`;
        link.click();
    }

    authenticateOwner(actionDescription = "ทำรายการนี้") {
        const inputPin = prompt(`🔐 [สิทธิ์เฉพาะเจ้าของระบบเท่านั้น]\n\nกรุณากรอกรหัสผ่านเจ้าของระบบเพื่อ${actionDescription}:`, "");
        if (inputPin === null) return false;
        
        if (this.db.verifyOwnerPin(inputPin)) {
            this.audio.playScanSuccess();
            return true;
        } else {
            this.audio.playError();
            alert("❌ รหัสผ่านเจ้าของระบบไม่ถูกต้อง! ไม่อนุญาตให้สิทธิ์ทำรายการนี้");
            return false;
        }
    }

    exportBackupData() {
        if (!this.authenticateOwner("ส่งออกไฟล์สำรองข้อมูล (Backup JSON)")) {
            return;
        }

        const data = {
            items: this.db.getItems(),
            logs: this.db.getLogs(),
            auditPerm: this.db.getAuditPermission(),
            requesters: this.db.getRequesters(),
            exportDate: new Date().toISOString()
        };

        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `PEA_Warehouse_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
    }

    openLocationEditModal(code) {
        this.closeModals();
        const item = this.db.getItemByCode(code);
        if (!item) return;

        // Verify Owner Password (Aunkung)
        if (!this.authenticateOwner(`ปรับยอดคงเหลือ 3 คลัง (MB52 / WMS / sloc 0023) ของพัสดุ [${item.name}]`)) {
            return;
        }

        this.selectedItemForModal = item;
        document.getElementById("locModalCode").textContent = `รหัสพัสดุ: ${item.code}`;
        document.getElementById("locModalName").textContent = item.name;
        document.getElementById("locCode").value = item.code;
        document.getElementById("locMb52Qty").value = item.mb52Qty || 0;
        document.getElementById("locWmsQty").value = item.wmsQty || 0;
        document.getElementById("locKk23Qty").value = item.kk23Qty || 0;

        const modal = document.getElementById("locationModal");
        if (modal) {
            modal.removeAttribute("hidden");
            modal.style.setProperty("display", "flex", "important");
            modal.classList.add("active");
        }
    }

    handleSaveLocationQuantities() {
        const code = document.getElementById("locCode").value;
        const mb52 = Number(document.getElementById("locMb52Qty").value);
        const wms = Number(document.getElementById("locWmsQty").value);
        const kk23 = Number(document.getElementById("locKk23Qty").value);

        try {
            const updated = this.db.updateLocationQuantities(code, mb52, wms, kk23);
            this.audio.playScanSuccess();
            this.closeModals();
            alert(`✅ บันทึกยอดคลัง MB52 (${mb52}), WMS (${wms}), sloc 0023 (${kk23}) ของ [${updated.name}] เรียบร้อยแล้ว`);

            if (this.activeTab === "dashboard") this.renderDashboard();
            if (this.activeTab === "stock") this.renderStockTable();
            if (this.activeTab === "alerts") this.renderAlertsPage();
        } catch (err) {
            this.audio.playError();
            alert(`❌ เกิดข้อผิดพลาด: ${err.message}`);
        }
    }

    triggerImportLocationQuantities() {
        const fileInput = document.getElementById("locationImportFileInput");
        if (fileInput) {
            fileInput.value = "";
            fileInput.click();
        }
    }

    downloadBatchImportTemplate() {
        const items = this.db.getItems();

        let tableRows = items.map((item, index) => {
            const seq = index + 1;
            const code = item.code;
            const name = (item.name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            const unit = item.unit || "ชุด";
            const std = item.standard !== undefined ? item.standard : 0;
            const cur = item.currentQty !== undefined ? item.currentQty : 0;
            const mb52 = item.mb52Qty !== undefined ? item.mb52Qty : 0;
            const wms = item.wmsQty !== undefined ? item.wmsQty : 0;
            const kk23 = item.kk23Qty !== undefined ? item.kk23Qty : 0;

            return `
                <tr>
                    <td style="text-align: center;">${seq}</td>
                    <td style="mso-number-format:'\\@'; text-align: center; font-weight: bold;">${code}</td>
                    <td>${name}</td>
                    <td style="text-align: center;">${unit}</td>
                    <td style="background-color: #f7fee7 !important; color: #365314 !important; font-weight: bold; text-align: right; mso-number-format:'\\#\\,\\#\\#0';">${std}</td>
                    <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right;">${cur}</td>
                    <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right;">${mb52}</td>
                    <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right;">${wms}</td>
                    <td style="mso-number-format:'\\#\\,\\#\\#0'; text-align: right;">${kk23}</td>
                </tr>
            `;
        }).join("");

        const excelContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
            <head>
            <meta charset="utf-8">
            <!--[if gte mso 9]>
            <xml>
             <x:ExcelWorkbook>
              <x:ExcelWorksheets>
               <x:ExcelWorksheet>
                <x:Name>แบบฟอร์มนำเข้าพัสดุ</x:Name>
                <x:WorksheetOptions>
                 <x:DisplayGridlines/>
                </x:WorksheetOptions>
               </x:ExcelWorksheet>
              </x:ExcelWorksheets>
             </x:ExcelWorkbook>
            </xml>
            <![endif]-->
            <style>
                table { border-collapse: collapse; width: 100%; font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 11pt; }
                th { background-color: #1e293b; color: #ffffff; font-weight: bold; border: 0.5pt solid #94a3b8; padding: 6px 10px; text-align: center; }
                td { border: 0.5pt solid #cbd5e1; padding: 5px 8px; vertical-align: middle; }
                th.std-header { background-color: #d9f99d !important; color: #365314 !important; font-weight: bold; text-align: center; border: 0.5pt solid #a3e635; }
            </style>
            </head>
            <body>
            <table>
                <thead>
                    <tr>
                        <th>ลำดับ</th>
                        <th>รหัสพัสดุ</th>
                        <th>รายการพัสดุ</th>
                        <th>หน่วยนับ</th>
                        <th class="std-header">เกณฑ์มาตรฐาน</th>
                        <th>คงเหลือจริง(storage location 2601)</th>
                        <th>คงเหลือใน MB52</th>
                        <th>คงเหลือใน WMS</th>
                        <th>คลังกฟจ.ขอนแก่น (sloc 0023)</th>
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
        link.download = `แบบฟอร์มนำเข้ายอดพัสดุ_MB52_WMS.xls`;
        link.click();
    }

    handleLocationBatchImport(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if ((char === ',' || char === ';' || char === '\t') && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        };

        const cleanNum = (val) => {
            if (val === undefined || val === null || val === '') return undefined;
            const str = String(val).replace(/["'\s,]/g, '').trim();
            if (str === '') return undefined;
            const num = Number(str);
            return isNaN(num) ? undefined : num;
        };

        const reader = new FileReader();
        reader.onload = (e) => {
            const buffer = e.target.result;
            let content = "";

            // Auto-detect & Fallback Encoding (UTF-8 -> TIS-620 -> Windows-874)
            try {
                const utf8Decoder = new TextDecoder("utf-8", { fatal: true });
                content = utf8Decoder.decode(buffer);
            } catch (utfErr) {
                try {
                    const tisDecoder = new TextDecoder("tis-620");
                    content = tisDecoder.decode(buffer);
                } catch (tisErr) {
                    const winDecoder = new TextDecoder("windows-874");
                    content = winDecoder.decode(buffer);
                }
            }

            // Support HTML/XML Excel Table parsing (.xls file uploaded back)
            if (content.toLowerCase().includes("<table") || content.toLowerCase().includes("<tr")) {
                try {
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(content, "text/html");
                    const trs = doc.querySelectorAll("tr");
                    const extractedLines = [];
                    trs.forEach(tr => {
                        const cellVals = Array.from(tr.querySelectorAll("th, td")).map(td => td.textContent.trim());
                        if (cellVals.length > 0) {
                            extractedLines.push(cellVals.join("\t"));
                        }
                    });
                    if (extractedLines.length > 0) {
                        content = extractedLines.join("\n");
                    }
                } catch(e) {}
            }

            try {
                const lines = content.split(/\r?\n/);
                const batchData = [];
                let codeIdx = -1, seqIdx = -1, curIdx = -1, mb52Idx = -1, wmsIdx = -1, kk23Idx = -1;

                // Smart Header Auto-Detection
                if (lines.length > 0) {
                    const firstLineParts = parseCSVLine(lines[0]);
                    firstLineParts.forEach((part, colIdx) => {
                        const lower = part.toLowerCase();
                        if (lower.includes("ลำดับ") || lower.includes("seq") || lower.includes("no.")) seqIdx = colIdx;
                        if (lower.includes("รหัส") || lower.includes("code") || lower.includes("mat")) codeIdx = colIdx;
                        if (lower.includes("2601") || lower.includes("คงเหลือจริง") || lower.includes("กระดาน")) curIdx = colIdx;
                        if (lower.includes("mb52") || lower.includes("mb-52")) mb52Idx = colIdx;
                        if (lower.includes("wms")) wmsIdx = colIdx;
                        if (lower.includes("0023") || lower.includes("กฟจ") || lower.includes("ขอนแก่น")) kk23Idx = colIdx;
                    });
                }

                const hasHeaderMap = (codeIdx !== -1 || mb52Idx !== -1 || wmsIdx !== -1);

                lines.forEach((line, idx) => {
                    const cleanLine = line.trim();
                    if (!cleanLine) return;
                    
                    const parts = parseCSVLine(cleanLine);
                    
                    // Skip header line
                    if (idx === 0) {
                        const col0 = parts[0] ? parts[0].toLowerCase() : "";
                        const col1 = parts[1] ? parts[1].toLowerCase() : "";
                        if (col0.includes("ลำดับ") || col0.includes("รหัส") || col1.includes("รหัส") || col0.includes("seq") || col0.includes("code")) {
                            return;
                        }
                    }

                    if (hasHeaderMap) {
                        const codeVal = codeIdx !== -1 ? parts[codeIdx] : null;
                        const seqVal = seqIdx !== -1 ? parts[seqIdx] : parts[0];
                        const curVal = curIdx !== -1 ? cleanNum(parts[curIdx]) : undefined;
                        const mb52Val = mb52Idx !== -1 ? cleanNum(parts[mb52Idx]) : undefined;
                        const wmsVal = wmsIdx !== -1 ? cleanNum(parts[wmsIdx]) : undefined;
                        const kk23Val = kk23Idx !== -1 ? cleanNum(parts[kk23Idx]) : undefined;

                        if (codeVal || seqVal) {
                            batchData.push({
                                seq: seqVal,
                                code: codeVal,
                                currentQty: curVal,
                                mb52Qty: mb52Val,
                                wmsQty: wmsVal,
                                kk23Qty: kk23Val
                            });
                        }
                    } else {
                        // Fallback Scheme Matching
                        if (parts.length >= 9) {
                            batchData.push({
                                seq: parts[0],
                                code: parts[1],
                                currentQty: cleanNum(parts[5]),
                                mb52Qty: cleanNum(parts[6]),
                                wmsQty: cleanNum(parts[7]),
                                kk23Qty: cleanNum(parts[8])
                            });
                        } else if (parts.length >= 8) {
                            batchData.push({
                                seq: parts[0],
                                code: parts[1],
                                currentQty: cleanNum(parts[5]),
                                mb52Qty: cleanNum(parts[6]),
                                wmsQty: cleanNum(parts[7]),
                                kk23Qty: cleanNum(parts[7])
                            });
                        } else if (parts.length >= 6) {
                            batchData.push({
                                seq: parts[0],
                                code: parts[1],
                                mb52Qty: cleanNum(parts[3]),
                                wmsQty: cleanNum(parts[4]),
                                kk23Qty: cleanNum(parts[5])
                            });
                        } else if (parts.length >= 4) {
                            const isCode = parts[0] && parts[0].length >= 8;
                            batchData.push({
                                seq: isCode ? null : parts[0],
                                code: isCode ? parts[0] : null,
                                mb52Qty: cleanNum(parts[1]),
                                wmsQty: cleanNum(parts[2]),
                                kk23Qty: cleanNum(parts[3])
                            });
                        }
                    }
                });

                if (batchData.length === 0) {
                    alert("⚠️ ไม่พบข้อมูลที่ถูกต้องในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ CSV หรือดาวน์โหลดแบบฟอร์มนำเข้าตัวอย่างครับ");
                    return;
                }

                const updatedCount = this.db.importLocationQuantitiesBatch(batchData);
                this.audio.playScanSuccess();
                alert(`✅ นำเข้าและอัปเดตข้อมูลพัสดุสำเร็จ ${updatedCount} รายการเรียบร้อยแล้ว!`);

                if (this.activeTab === "dashboard") this.renderDashboard();
                if (this.activeTab === "stock") this.renderStockTable();
                if (this.activeTab === "alerts") this.renderAlertsPage();

            } catch (err) {
                this.audio.playError();
                alert(`❌ เกิดข้อผิดพลาดในการอ่านไฟล์: ${err.message}`);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    resetSystemData() {
        if (!this.authenticateOwner("คืนค่ารีเซ็ตข้อมูลพัสดุตั้งต้นทั้งหมด")) {
            return;
        }

        if (confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตระบบและคืนค่าข้อมูลพัสดุตั้งต้นทั้งหมด?")) {
            this.db.resetToDefault();
            alert("✅ คืนค่าระบบเรียบร้อยแล้ว");
            this.renderDashboard();
        }
    }
}
