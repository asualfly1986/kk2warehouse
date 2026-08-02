/**
 * Data Service & Master Item List for Electrical Warehouse System
 * Source: Google Sheets - คลังพัสดุ ผปบ.กฟส.ขก.2
 */

const DEMO_IMAGES = {
    "1000110001": "ภาพอุปกรณ์/คอน,คอนกรีตอัดแรง(คอร.)แบบสปันแรงสูง 100X100X2,500 มม.jpg",
    "1000110003": "ภาพอุปกรณ์/คอน,คอนกรีตอัดแรง (คอร.)แบบสปัน (สำหรับเข้าปลายสาย) 120X120X2,000 มม..png",
    "1010000100": "ภาพอุปกรณ์/เหล็กฉาก รับสายล่อฟ้าทางโค้ง ขนาด 65x65x6 มม. ยาว 2,250 มม. และ 2,100 มม..jpg",
    "1010100000": "ภาพอุปกรณ์/ลวดเหล็กกลม เส้นผ่านศูนย์กลาง 4.0 มม.เส้นเดียว มอก.71.png",
    "1010100002": "ภาพอุปกรณ์/ลวดเหล็กตีเกลียว 25 ต.มม. มอก.404.png",
    "1010110200": "ภาพอุปกรณ์/สลักเกลียว เอ็ม 16x130 มม..jpg",
    "1040030012": "ภาพอุปกรณ์/ฟิวส์ลิงค์ 22 เควี 65 แอมป์ EEI-NEMA แบบ K.jfif",
    "1040030013": "ภาพอุปกรณ์/ฟิวส์ลิงค์ 22 เควี 100 แอมป์ EEI-NEMA แบบ K.jpg",
    "1040000002": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'><rect width='200' height='200' fill='%231e293b'/><rect x='75' y='40' width='50' height='120' rx='10' fill='%2310b981' opacity='0.8'/><path d='M65 60 H135 M65 90 H135 M65 120 H135' stroke='%2306b6d4' stroke-width='6'/><text x='100' y='185' font-family='sans-serif' font-size='11' font-weight='bold' fill='%2394a3b8' text-anchor='middle'>LIGHTNING ARRESTER 24kV</text></svg>"
};

const MASTER_ITEMS = [
    { code: "1000110001", name: "คอน,คอนกรีตอัดแรง(คอร.)แบบสปันแรงสูง 100X100X2,500 มม.", standard: 15, unit: "ท่อน", category: "เสาและคอน" },
    { code: "1000110003", name: "คอน,คอนกรีตอัดแรง (คอร.)แบบสปัน (สำหรับเข้าปลายสาย) 120X120X2,000 มม.", standard: 9, unit: "ท่อน", category: "เสาและคอน" },
    { code: "1010000100", name: "เหล็กฉาก รับสายล่อฟ้าทางโค้ง ขนาด 65x65x6 มม. ยาว 2,250 มม. และ 2,100 มม.", standard: 5, unit: "อัน", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1010100000", name: "ลวดเหล็กกลม เส้นผ่านศูนย์กลาง 4.0 มม.เส้นเดียว มอก.71", standard: 12, unit: "กก.", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1010100002", name: "ลวดเหล็กตีเกลียว 25 ต.มม. มอก.404", standard: 20, unit: "เมตร", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1010110200", name: "สลักเกลียว เอ็ม 16x130 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110201", name: "สลักเกลียว เอ็ม 16x170 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110202", name: "สลักเกลียว เอ็ม 16x200 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110203", name: "สลักเกลียว เอ็ม 16x250 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110204", name: "สลักเกลียว เอ็ม 16x300 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110205", name: "สลักเกลียว เอ็ม 16x350 มม.", standard: 20, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110206", name: "สลักเกลียว เอ็ม 16x400 มม.", standard: 15, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010110207", name: "สลักเกลียว เอ็ม 16x450 มม.", standard: 15, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010120000", name: "สลักเกลียวตลอด เอ็ม 16x400 มม.", standard: 10, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010120001", name: "สลักเกลียวตลอด เอ็ม 16x450 มม.", standard: 10, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010120002", name: "สลักเกลียวตลอด เอ็ม 16x500 มม.", standard: 10, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010130001", name: "สลักเกลียวห่วงกลม เอ็ม 16x450 มม.", standard: 15, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010130002", name: "สลักเกลียวห่วงกลม เอ็ม 16x500 มม.", standard: 15, unit: "ชุด", category: "สลักเกลียวและนัท" },
    { code: "1010180001", name: "นัทรูปห่วง เอ็ม 16 ดิน 582", standard: 10, unit: "อัน", category: "สลักเกลียวและนัท" },
    { code: "1010180100", name: "แหวนรองแบบเรียบ ประเภทจัตุรัสขนาดใหญ่ 52x52x4.5 มม.รู 18 มม.", standard: 30, unit: "อัน", category: "สลักเกลียวและนัท" },
    { code: "1010200001", name: "เหล็กประกับไม้คอน ขนาด 30x6 มม. ยาว 760 มม.", standard: 10, unit: "อัน", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1010230000", name: "ยูแคล้มป์ สลัก 1 ตัว เอ็ม 8 (ไวร์ โร๊ป คลิ้ฟ)", standard: 20, unit: "ชุด", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1010230012", name: "CLAMP, DOUBLE BOLTS, ST. WIRE 25 SQ.MM.", standard: 20, unit: "ชุด", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1010230001", name: "ยูแคล้มป์ สลักคู่ เอ็ม 16 (ไวร์ โร๊ป คลิ้ฟ)", standard: 20, unit: "ชุด", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020010007", name: "สายอลูมิเนียมเปลือย 185 ต.มม. มอก.85", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020020002", name: "สายอลูมิเนียมแกนเหล็ก 50/8 ต.มม. มอก.86", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020050000", name: "เคเบิลอากาศ อลูมิเนียม 22 เควี 1x50 ต.มม.", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020050004", name: "เคเบิลอากาศ อลูมิเนียม 22 เควี 1x185 ต.มม.", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020070002", name: "สายอลูมิเนียมตีเกลียวชนิดอัดแน่นหุ้มฉนวน พีวีซี 750V 50 ต.มม.", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020070004", name: "สายอลูมิเนียมตีเกลียวชนิดอัดแน่นหุ้มฉนวน พีวีซี 750V 95 ต.มม.", standard: 100, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020080501", name: "สายทองแดงตีเกลียวหุ้มฉนวน XLPE/PVC 2x10 ต.มม 600V", standard: 42, unit: "เมตร", category: "สายไฟฟ้าและเคเบิล" },
    { code: "1020180001", name: "เทปไฟฟ้า พีวีซี ใช้ภายนอก 0.18x19x10,000 มม. มอก.386", standard: 50, unit: "ม้วน", category: "เทปและฉนวน" },
    { code: "1020180008", name: "EPR, HIGH-VOLTAGE INSULATING TAPE", standard: 30, unit: "ม้วน", category: "เทปและฉนวน" },
    { code: "1020200000", name: "ลวดอลูมิเนียมแบน 1x10 มม.", standard: 20, unit: "กก.", category: "อุปกรณ์ต่อสาย" },
    { code: "1020200002", name: "ลวดอลูมิเนียมกลม 4.0 มม.", standard: 20, unit: "กก.", category: "อุปกรณ์ต่อสาย" },
    { code: "1020200003", name: "COVERED TIE WIRE AL 4.0 MM.", standard: 20, unit: "เมตร", category: "อุปกรณ์ต่อสาย" },
    { code: "1020210107", name: "ปรีฟอร์มไลน์การ์ด สำหรับสายอลูมิเนียม 185 ต.มม.", standard: 20, unit: "ชุด", category: "อุปกรณ์ต่อสาย" },
    { code: "1020260202", name: "PREFORMED D/E, SAC 22kV 50sq.mm. 21.80mm", standard: 20, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020260205", name: "PREFORMED D/E, SAC 22kV 185sq.mm. 29.78mm", standard: 20, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020260301", name: "PREFORMED D/E, AW 50 SQ.MM.", standard: 20, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020260302", name: "PREFORMED D/E, AW 95 SQ.MM.", standard: 20, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020300101", name: "พีจี. คอนเนคเตอร์สลักคู่ สำหรับสายอลูมิเนียม 16-70 ต.มม.", standard: 100, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020300102", name: "พีจี. คอนเนคเตอร์สลักคู่ สำหรับสายอลูมิเนียม 25-95 ต.มม.", standard: 100, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020300103", name: "พีจี. คอนเนคเตอร์ 3 สลัก สำหรับสายอลูมิเนียม 70-185 ต.มม.", standard: 50, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020260303", name: "คอนเนคเตอร์เข้าปลายสายอลูมิเนียม 50-70 ต.มม.", standard: 20, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020260304", name: "คอนเนคเตอร์เข้าปลายสายอลูมิเนียม 95-120 ต.มม.", standard: 20, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020330005", name: "HOTLINE BAIL-CLAMP, MAIN 35-70 SQ.MM.", standard: 30, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020330006", name: "HOTLINE BAIL-CLAMP, MAIN 70-185 SQ.MM.", standard: 30, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020330104", name: "HOTLINE CLAMP, MAIN35-185, TAP50-185SQ.MM.", standard: 30, unit: "ชุด", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020360000", name: "IPC MAIN 16-95 SQ.MM. TAP 6-35 SQ.MM.", standard: 40, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1020400004", name: "หลอดต่อสายชนิดบีบ รับแรงดึงสายอลูมิเนียม 95 ต.มม.", standard: 40, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020400012", name: "SLEEVE, TENSION AL 50 SQ.MM.", standard: 40, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020400017", name: "SLEEVE, TENSION AL 185 SQ.MM.", standard: 40, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020410004", name: "หลอดต่อสายชนิดบีบ ไม่รับแรงดึงสายอลูมิเนียม 95 ต.มม.", standard: 40, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020410014", name: "SLEEVE, TENSIONLESS AL 50 SQ.MM.", standard: 40, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020410017", name: "SLEEVE, TENSIONLESS AL 185 SQ.MM.", standard: 30, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020420102", name: "หางปลา เจาะรูมาตรฐานเนม่า สำหรับสายอลูมิเนียม 50 ต.มม.", standard: 30, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020420104", name: "หางปลา เจาะรูมาตรฐานเนม่า สำหรับสายอลูมิเนียม 95 ต.มม.", standard: 30, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020420106", name: "หางปลา เจาะรูมาตรฐานเนม่า สำหรับสายอลูมิเนียม 185 ต.มม.", standard: 30, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020420400", name: "สลักต่อปลายสายเข้าอุปกรณ์ไฟฟ้าสำหรับสายอลูมิเนียม 50 ต.มม.", standard: 20, unit: "อัน", category: "อุปกรณ์ต่อสาย" },
    { code: "1020440008", name: "เคเบิลสเปเซอร์ โพลีเอทิลีน สำหรับสายเคเบิลอากาศ 22-33kV 50-185 ต.มม.", standard: 20, unit: "ชุด", category: "อุปกรณ์ต่อสาย" },
    { code: "1020440112", name: "เหล็กคอนเคเบิลอากาศทางโค้ง ระบบ 22kV และ 33kV แบบ SA4-015/44007", standard: 5, unit: "อัน", category: "เสาและคอน" },
    { code: "1030010002", name: "ลูกถ้วยไลน์โพสท์ไทพ์ 22 เควี แบบ 57-2L ชนิดทนเพาเวอร์อาร์ค", standard: 50, unit: "ชุด", category: "ลูกถ้วยไฟฟ้า" },
    { code: "1030020000", name: "ลูกถ้วยแขวนแบบ ก(แบบ 52-1) มอก.354", standard: 50, unit: "ลูก", category: "ลูกถ้วยไฟฟ้า" },
    { code: "1030030000", name: "ลูกรอกแรงต่ำแบบ ข(แบบ 53-2) มอก.227", standard: 40, unit: "ลูก", category: "ลูกถ้วยไฟฟ้า" },
    { code: "1030110000", name: "สเตรนแคล้มป์แบบตรงอลูมิเนียม 35-70 ต.มม. ACSR 35-50 ต.มม.", standard: 10, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1030110004", name: "สเตรนแคล้มป์แบบตรงสำหรับสายอลูมิเนียม 185 ต.มม.", standard: 10, unit: "อัน", category: "แคล้มป์และคอนเนคเตอร์" },
    { code: "1030130000", name: "แร็ค 2x200 มม.(2x8) แบบหลังยื่น", standard: 10, unit: "อัน", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1030130002", name: "แร็ค 4x200 มม.(4x8) แบบหลังยื่น", standard: 10, unit: "อัน", category: "อุปกรณ์เหล็กและยึดสาย" },
    { code: "1040000000", name: "ล่อฟ้า 21 เควี 5 กิโลแอมป์", standard: 30, unit: "ชุด", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040000002", name: "ล่อฟ้า 24 เควี 5 กิโลแอมป์", standard: 15, unit: "ชุด", category: "ล่อฟ้าและฟิวส์", specialNotice: "กฟส.ชุมแพได้เท่านั้น", imageUrl: DEMO_IMAGES["1040000002"] },
    { code: "1040000300", name: "ล่อฟ้า 250-500 โวลท์ 2.5-5.0 กิโลแอมป์", standard: 20, unit: "ชุด", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040010002", name: "ดรอพเอาท์ฟิวส์คัทเอาท์ 22 เควี 100 แอมป์ 12 เคเอ", standard: 30, unit: "ชุด", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040010006", name: "กระบอกฟิวส์ 22 เควี 100 แอมป์ 12 เคเอ", standard: 20, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020010", name: "H.R.C. FUSE, BLADE CONTACT, 32 A", standard: 15, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020011", name: "H.R.C. FUSE, BLADE CONTACT, 50 A", standard: 70, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020012", name: "H.R.C. FUSE, BLADE CONTACT, 80 A", standard: 70, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020013", name: "H.R.C. FUSE, BLADE CONTACT, 100 A", standard: 70, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020014", name: "H.R.C. FUSE, BLADE CONTACT, 160 A", standard: 70, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020015", name: "H.R.C. FUSE, BLADE CONTACT, 200 A", standard: 70, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020016", name: "H.R.C. FUSE, BLADE CONTACT, 250 A", standard: 40, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020017", name: "H.R.C. FUSE, BLADE CONTACT, 315 A", standard: 20, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020019", name: "H.R.C. FUSE, BLADE CONTACT, 400 A", standard: 15, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020100", name: "ฟิวส์สวิตช์แรงต่ำ 1x400 แอมป์ 500 โวลท์", standard: 60, unit: "ชุด", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040020102", name: "สวิตซ์แรงต่ำแบบหุ้มฉนวน ชนิด 1 เฟส 1x400A 400V", standard: 30, unit: "ชุด", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030002", name: "ฟิวส์ลิงค์ 22 เควี 3 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030003", name: "ฟิวส์ลิงค์ 22 เควี 5-6 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030004", name: "ฟิวส์ลิงค์ 22 เควี 8 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030005", name: "ฟิวส์ลิงค์ 22 เควี 10 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030006", name: "ฟิวส์ลิงค์ 22 เควี 15 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030007", name: "ฟิวส์ลิงค์ 22 เควี 20 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030008", name: "ฟิวส์ลิงค์ 22 เควี 25 แอมป์ EEI-NEMA แบบ K", standard: 70, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030009", name: "ฟิวส์ลิงค์ 22 เควี 30 แอมป์ EEI-NEMA แบบ K", standard: 50, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030010", name: "ฟิวส์ลิงค์ 22 เควี 40 แอมป์ EEI-NEMA แบบ K", standard: 50, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030011", name: "ฟิวส์ลิงค์ 22 เควี 50 แอมป์ EEI-NEMA แบบ K", standard: 30, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030012", name: "ฟิวส์ลิงค์ 22 เควี 65 แอมป์ EEI-NEMA แบบ K", standard: 30, unit: "เส้น", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030013", name: "ฟิวส์ลิงค์ 22 เควี 100 แอมป์ EEI-NEMA แบบ K", standard: 10, unit: "เส้น", category: "ล่อฟ้าและฟิวส์", specialNotice: "กฟส.ท่าพระสำรองได้เท่านั้น", imageUrl: DEMO_IMAGES["1040030013"] },
    { code: "1040030203", name: "FUSE LINK 22 KV 40 A FOR SWITCHGEAR", standard: 9, unit: "อัน", category: "ล่อฟ้าและฟิวส์" },
    { code: "1040030207", name: "FUSE LINK 22 KV 100A FOR SWITCHGEAR", standard: 9, unit: "อัน", category: "ล่อฟ้าและฟิวส์" }
];

const DEFAULT_REQUESTERS_LIST = [
    "อานนท์ วรรณอมรกุล", "ทศพร คงวันดี", "ฤทธิเกียรติ ทาขุลี", "มนตรี ทองศรี", "อภิชาติ ยุพิน",
    "ปรรัฐ บาลยอ", "ทศพร ชานนท์", "ชินดนัย บุณยแต่ง", "นายบุญไทย นามพิลา", "นายปวริศร ฤทธิ์ชัย",
    "นายสมการ อุ่นเอ้ย", "นายสมชาย ชาเคน", "นายวุฒิพงษ์ มาสุ่ม", "นายบุญส่ง กงพลี", "นายกิตติภูมิ ลีซีทวน",
    "นายวิชา พรมจักร", "นายวินัย กงศรี", "นายอัครเดช นันตะนัย", "นายพงษ์ภิญโญ ดวลลาดนา", "นายชูพงษ์ วิวัฒน์วงตระกูล",
    "วชิรพงษ์ นาเมืองรักษ์", "อภินัทธ์ ดีบุญมี ณ ชุมแพ", "ภุชงค์ เพชรคำ", "อรรถพร สืบสุนทร"
];

function getItemStatus(currentQty, standardQty) {
    const current = Number(currentQty);
    const std = Number(standardQty);
    if (std <= 0) return { key: "full", label: "❇️ เต็ม 100% (Full Stock)", pct: 100, badgeClass: "badge-success" };
    
    const pct = Math.round((current / std) * 100);
    if (pct < 50) return { key: "out_of_stock", label: "🔴 จัดซื้อ/จัดหา (Min. Stock)", pct, badgeClass: "badge-danger" };
    else if (pct >= 50 && pct <= 60) return { key: "low", label: "🟧 เตือน (50-60% Warning)", pct, badgeClass: "badge-orange" };
    else if (pct >= 61 && pct <= 80) return { key: "normal", label: "🟡 พอดี (61-80% Fair)", pct, badgeClass: "badge-lime" };
    else if (pct >= 81 && pct <= 99) return { key: "good", label: "🟢 ดี (81-99% Good)", pct, badgeClass: "badge-lightgreen" };
    else if (pct === 100) return { key: "full", label: "❇️ เต็ม 100% (Full Stock)", pct, badgeClass: "badge-success" };
    else return { key: "over", label: "🔵 เกิน 100% (Over Stock)", pct, badgeClass: "badge-info" };
}

class StockDatabase {
    constructor() {
        this.STORAGE_KEY_ITEMS = "pea_warehouse_items_v4";
        this.STORAGE_KEY_LOGS = "pea_warehouse_logs_v4";
        this.STORAGE_KEY_AUDIT_PERM = "pea_warehouse_audit_perm";
        this.STORAGE_KEY_REQUESTERS = "pea_warehouse_requesters_v4";
        this.STORAGE_KEY_OWNER_PIN = "pea_warehouse_owner_pin";
        this.init();
    }

    zeroAllQuantities() {
        const items = MASTER_ITEMS.map(mItem => ({
            ...mItem,
            currentQty: 0,
            mb52Qty: 0,
            wmsQty: 0,
            kk23Qty: 0,
            imageUrl: DEMO_IMAGES[mItem.code] || null,
            lastUpdated: new Date().toISOString()
        }));
        this.saveItems(items);
        this.saveLogs([]);
        this.pushToCloudflare();
        return items;
    }

    init() {
        try {
            const storedItems = JSON.parse(localStorage.getItem(this.STORAGE_KEY_ITEMS) || "[]");
            const reordered = [];
            MASTER_ITEMS.forEach(mItem => {
                const existing = storedItems.find(s => s.code === mItem.code);
                if (existing) {
                    reordered.push({
                        ...mItem, 
                        currentQty: existing.currentQty !== undefined ? existing.currentQty : 0,
                        mb52Qty: existing.mb52Qty !== undefined ? existing.mb52Qty : 0,
                        wmsQty: existing.wmsQty !== undefined ? existing.wmsQty : 0,
                        kk23Qty: existing.kk23Qty !== undefined ? existing.kk23Qty : 0,
                        specialNotice: mItem.specialNotice || existing.specialNotice || null,
                        imageUrl: existing.imageUrl || DEMO_IMAGES[mItem.code] || null
                    });
                } else {
                    reordered.push({
                        ...mItem, 
                        currentQty: 0, mb52Qty: 0, wmsQty: 0, kk23Qty: 0,
                        imageUrl: DEMO_IMAGES[mItem.code] || null, lastUpdated: new Date().toISOString()
                    });
                }
            });
            localStorage.setItem(this.STORAGE_KEY_ITEMS, JSON.stringify(reordered));
        } catch(e) {}

        if (!localStorage.getItem(this.STORAGE_KEY_LOGS)) {
            localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify([]));
        }

        if (localStorage.getItem(this.STORAGE_KEY_AUDIT_PERM) === null) { localStorage.setItem(this.STORAGE_KEY_AUDIT_PERM, "true"); }
        if (!localStorage.getItem(this.STORAGE_KEY_REQUESTERS)) { localStorage.setItem(this.STORAGE_KEY_REQUESTERS, JSON.stringify(DEFAULT_REQUESTERS_LIST)); }
        localStorage.setItem(this.STORAGE_KEY_OWNER_PIN, "Aunkung");
    }

    updateItemImage(code, imageUrl) {
        const items = this.getItems();
        const itemIndex = items.findIndex(i => i.code === code);
        if (itemIndex === -1) throw new Error("ไม่พบพัสดุนี้ในระบบ");
        items[itemIndex].imageUrl = imageUrl; items[itemIndex].lastUpdated = new Date().toISOString();
        this.saveItems(items); return items[itemIndex];
    }

    updateLocationQuantities(code, mb52Qty, wmsQty, kk23Qty) {
        const items = this.getItems();
        const itemIndex = items.findIndex(i => i.code === code);
        if (itemIndex === -1) throw new Error("ไม่พบพัสดุนี้ในระบบ");
        const item = items[itemIndex];
        const oldMb = item.mb52Qty || 0;
        const oldWm = item.wmsQty || 0;
        const oldKk = item.kk23Qty || 0;
        
        item.mb52Qty = Number(mb52Qty) || 0; 
        item.wmsQty = Number(wmsQty) || 0; 
        item.kk23Qty = Number(kk23Qty) || 0;
        item.lastUpdated = new Date().toISOString(); 
        this.saveItems(items); 
        this.pushToCloudflare();

        // Log import transaction
        const logs = this.getLogs();
        logs.unshift({
            id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            type: "import",
            code: item.code,
            name: item.name,
            qty: (Number(mb52Qty) || 0) + (Number(wmsQty) || 0) + (Number(kk23Qty) || 0),
            unit: item.unit || "ชิ้น",
            balanceBefore: oldMb + oldWm + oldKk,
            balanceAfter: (Number(mb52Qty) || 0) + (Number(wmsQty) || 0) + (Number(kk23Qty) || 0),
            requester: "Admin (อัปเดตคลัง)",
            workOrder: "IMPORT-LOCATIONS",
            note: `อัปเดตยอดคลัง (MB52: ${mb52Qty}, WMS: ${wmsQty}, sloc 0023: ${kk23Qty})`
        });
        this.saveLogs(logs);

        return items[itemIndex];
    }

    importLocationQuantitiesBatch(batchData) {
        const items = this.getItems();
        const logs = this.getLogs();
        let updatedCount = 0;
        const nowIso = new Date().toISOString();

        batchData.forEach(row => {
            let item = null;
            if (row.code) item = items.find(i => i.code.trim() === String(row.code).trim());
            if (!item && row.seq) {
                const seqNum = Number(row.seq);
                if (seqNum >= 1 && seqNum <= MASTER_ITEMS.length) {
                    const targetCode = MASTER_ITEMS[seqNum - 1].code;
                    item = items.find(i => i.code === targetCode);
                }
            }
            if (item) {
                const oldQty = item.currentQty || 0;
                if (row.currentQty !== undefined) item.currentQty = Number(row.currentQty) || 0;
                if (row.mb52Qty !== undefined) item.mb52Qty = Number(row.mb52Qty) || 0;
                if (row.wmsQty !== undefined) item.wmsQty = Number(row.wmsQty) || 0;
                if (row.kk23Qty !== undefined) item.kk23Qty = Number(row.kk23Qty) || 0;
                item.lastUpdated = nowIso;
                updatedCount++;

                logs.unshift({
                    id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
                    timestamp: nowIso,
                    type: "import",
                    code: item.code,
                    name: item.name,
                    qty: item.currentQty,
                    unit: item.unit || "ชิ้น",
                    balanceBefore: oldQty,
                    balanceAfter: item.currentQty,
                    requester: "Admin (นำเข้าไฟล์)",
                    workOrder: "IMPORT-BATCH-EXCEL",
                    note: `นำเข้าพัสดุแบบไฟล์ (คงเหลือ 2601: ${item.currentQty})`
                });
            }
        });
        this.saveItems(items); 
        this.saveLogs(logs);
        this.pushToCloudflare();
        return updatedCount;
    }

    getOwnerPin() { return localStorage.getItem(this.STORAGE_KEY_OWNER_PIN) || "Aunkung"; }
    verifyOwnerPin(inputPin) { return inputPin && inputPin.trim() === this.getOwnerPin(); }
    verifyRequestersPin(inputPin) { return inputPin && inputPin.trim() === "AunkungTuy"; }

    getRequesters() {
        const stored = localStorage.getItem(this.STORAGE_KEY_REQUESTERS);
        if (stored) return JSON.parse(stored); return DEFAULT_REQUESTERS_LIST;
    }

    addRequester(name) {
        const list = this.getRequesters(); const cleanName = name.trim();
        if (!cleanName) throw new Error("กรุณากรอกชื่อผู้เบิก"); if (list.includes(cleanName)) throw new Error("รายชื่อนี้มีอยู่ในระบบแล้ว");
        list.push(cleanName); localStorage.setItem(this.STORAGE_KEY_REQUESTERS, JSON.stringify(list)); return list;
    }

    deleteRequester(name) {
        let list = this.getRequesters(); list = list.filter(n => n !== name);
        localStorage.setItem(this.STORAGE_KEY_REQUESTERS, JSON.stringify(list)); return list;
    }

    getAuditPermission() { return localStorage.getItem(this.STORAGE_KEY_AUDIT_PERM) !== "false"; }
    setAuditPermission(enabled) { localStorage.setItem(this.STORAGE_KEY_AUDIT_PERM, enabled ? "true" : "false"); }

    // 🟢 กำหนด API Base URL สำหรับ Cloudflare Worker + D1 Database
    getApiBaseUrl() {
        if (window.API_BASE_URL) return window.API_BASE_URL;
        if (window.location.hostname.includes('workers.dev') || window.location.hostname.includes('pages.dev')) {
            return window.location.origin;
        }
        return 'https://kk2warehouse.asualfly1986.workers.dev';
    }

    // 🟢 ซิงค์กับฐานข้อมูล D1
    async syncFromCloudflare() {
        try {
            const baseUrl = this.getApiBaseUrl();
            let hasChanges = false;
            const cacheBust = `t=${Date.now()}`;

            // 1. Sync Inventory Items Stock
            const res = await fetch(`${baseUrl}/api/inventory?${cacheBust}`);
            if (res.ok) {
                const dbItems = await res.json();
                if (dbItems && Array.isArray(dbItems) && dbItems.length > 0) {
                    let localItems = this.getItems();
                    let updated = false;

                    dbItems.forEach(dbItem => {
                        const targetCode = dbItem.id || dbItem.code;
                        const targetStock = dbItem.current_stock !== undefined ? dbItem.current_stock : dbItem.currentQty;
                        const localItem = localItems.find(i => i.code === targetCode);
                        if (localItem) {
                            if (targetStock !== undefined && Number(localItem.currentQty) !== Number(targetStock)) {
                                localItem.currentQty = Number(targetStock);
                                updated = true;
                            }
                            if (dbItem.mb52Qty !== undefined && Number(localItem.mb52Qty) !== Number(dbItem.mb52Qty)) {
                                localItem.mb52Qty = Number(dbItem.mb52Qty);
                                updated = true;
                            }
                            if (dbItem.wmsQty !== undefined && Number(localItem.wmsQty) !== Number(dbItem.wmsQty)) {
                                localItem.wmsQty = Number(dbItem.wmsQty);
                                updated = true;
                            }
                            if (dbItem.kk23Qty !== undefined && Number(localItem.kk23Qty) !== Number(dbItem.kk23Qty)) {
                                localItem.kk23Qty = Number(dbItem.kk23Qty);
                                updated = true;
                            }
                            if (dbItem.imageUrl && localItem.imageUrl !== dbItem.imageUrl) {
                                localItem.imageUrl = dbItem.imageUrl;
                                updated = true;
                            }
                        }
                    });

                    if (updated) {
                        localStorage.setItem(this.STORAGE_KEY_ITEMS, JSON.stringify(localItems));
                        hasChanges = true;
                        console.log("☁️ Successfully updated local stock from Cloudflare D1!");
                        if (window.app && typeof window.app.renderStockTable === 'function') {
                            window.app.renderStockTable(); 
                            window.app.renderDashboard();
                        }
                        if (window.chartsPage && typeof window.chartsPage.renderAllCharts === 'function') {
                            window.chartsPage.renderKpis();
                            window.chartsPage.renderAllCharts();
                            window.chartsPage.renderStockTable();
                        }
                    }
                }
            }

            // 2. Sync Transaction History Logs directly from D1 Database (Single Source of Truth)
            const logsRes = await fetch(`${baseUrl}/api/logs?${cacheBust}`);
            if (logsRes.ok) {
                const dbLogs = await logsRes.json();
                if (Array.isArray(dbLogs)) {
                    const formattedLogs = dbLogs.map(l => ({
                        id: l.id || ("LOG-" + new Date(l.timestamp || Date.now()).getTime()),
                        timestamp: l.timestamp || new Date().toISOString(),
                        type: l.type || (l.qty < 0 ? 'out' : 'in'),
                        code: l.itemCode || l.code || '',
                        name: l.itemName || l.name || '',
                        qty: Math.abs(Number(l.qty || 0)),
                        unit: l.unit || 'ชิ้น',
                        balanceBefore: Number(l.balanceBefore || 0),
                        balanceAfter: Number(l.currentStock || l.balanceAfter || 0),
                        requester: l.requester || '-',
                        workOrder: l.workOrder || '-',
                        note: l.note || '-'
                    }));

                    let existingLogs = this.getLogs();
                    if (JSON.stringify(formattedLogs) !== JSON.stringify(existingLogs)) {
                        this.saveLogs(formattedLogs);
                        hasChanges = true;
                        console.log("☁️ Successfully synced 100% strict logs from Cloudflare D1 Database!");
                    }
                }
            }

            return hasChanges;
        } catch (e) { console.warn("Cloudflare sync notice:", e.message); }
        return false;
    }

    async pushToCloudflare() {
        try {
            const baseUrl = this.getApiBaseUrl();
            const items = this.getItems();
            await fetch(`${baseUrl}/api/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(items)
            });
        } catch (e) { console.warn("Cloudflare push notice:", e.message); }
    }

    getItems() { return JSON.parse(localStorage.getItem(this.STORAGE_KEY_ITEMS) || "[]"); }
    saveItems(items) { localStorage.setItem(this.STORAGE_KEY_ITEMS, JSON.stringify(items)); }
    getLogs() { return JSON.parse(localStorage.getItem(this.STORAGE_KEY_LOGS) || "[]"); }
    saveLogs(logs) { localStorage.setItem(this.STORAGE_KEY_LOGS, JSON.stringify(logs)); }
    getItemByCode(code) { const items = this.getItems(); return items.find(i => i.code === code || i.code.trim() === code.trim()); }

    // 🟢 ยิงคำสั่งอัปเดตยอดคงเหลือไปที่ Cloudflare D1
    processTransaction(type, code, qty, requester = "-", workOrder = "-", note = "") {
        if (type === "audit" && !this.getAuditPermission()) throw new Error("⚠️ สิทธิ์ปิดใช้งานโดย Admin");

        const items = this.getItems();
        const itemIndex = items.findIndex(i => i.code === code);
        if (itemIndex === -1) throw new Error(`ไม่พบรหัสพัสดุ ${code}`);

        const item = items[itemIndex];
        const oldQty = Number(item.currentQty);
        let newQty = oldQty;
        const changeQty = Number(qty);
        let changeToSend = 0; 

        if (type === "dispense") {
            if (oldQty < changeQty) throw new Error(`จำนวนคงเหลือไม่พอสำหรับการเบิก!`);
            newQty = oldQty - changeQty; changeToSend = -changeQty; 
        } else if (type === "receive") {
            newQty = oldQty + changeQty; changeToSend = changeQty;  
        } else if (type === "audit") {
            newQty = changeQty; changeToSend = newQty - oldQty; 
        }

        items[itemIndex].currentQty = newQty;
        items[itemIndex].lastUpdated = new Date().toISOString();
        this.saveItems(items);

        const logType = type === 'dispense' ? 'out' : (type === 'receive' ? 'in' : 'audit');
        const logObj = {
            id: "LOG-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString(),
            type: logType,
            code: code,
            name: item.name,
            qty: Math.abs(changeQty),
            unit: item.unit || "ชิ้น",
            balanceBefore: oldQty,
            balanceAfter: newQty,
            requester: requester,
            workOrder: workOrder,
            note: note
        };

        // Save log locally
        const logs = this.getLogs();
        logs.unshift(logObj);
        this.saveLogs(logs);

        // 🟢 ส่งไปอัปเดตฐานข้อมูล D1
        if (changeToSend !== 0) {
            const baseUrl = this.getApiBaseUrl();
            fetch(`${baseUrl}/api/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    id: code, 
                    code: code,
                    name: item.name, 
                    standard: item.standard, 
                    currentQty: newQty,
                    mb52Qty: item.mb52Qty || 0,
                    wmsQty: item.wmsQty || 0,
                    kk23Qty: item.kk23Qty || 0,
                    change: changeToSend,
                    log: {
                        timestamp: logObj.timestamp,
                        type: logType,
                        itemCode: code,
                        itemName: item.name,
                        qty: logObj.qty,
                        currentStock: newQty,
                        requester: requester,
                        workOrder: workOrder,
                        note: note
                    }
                })
            }).catch(e => console.error("D1 Update Error:", e));

            this.pushToCloudflare();
        }

        const updatedItem = items[itemIndex];
        return {
            item: updatedItem,
            log: logObj,
            code: updatedItem.code,
            name: updatedItem.name,
            currentQty: updatedItem.currentQty,
            unit: updatedItem.unit || "ชิ้น",
            standard: updatedItem.standard,
            category: updatedItem.category,
            mb52Qty: updatedItem.mb52Qty,
            wmsQty: updatedItem.wmsQty,
            kk23Qty: updatedItem.kk23Qty
        };
    }

    updateItemImage(code, imageUrl) {
        const items = this.getItems(); const item = items.find(i => i.code === code);
        if (item) { item.imageUrl = imageUrl; this.saveItems(items); return item; } return null;
    }
    resetItemImage(code) {
        const items = this.getItems(); const item = items.find(i => i.code === code);
        if (item) { item.imageUrl = DEMO_IMAGES[code] || null; this.saveItems(items); return item; } return null;
    }
    resetAllItemImages() {
        const items = this.getItems(); items.forEach(item => { item.imageUrl = DEMO_IMAGES[item.code] || null; });
        this.saveItems(items); return items;
    }
    resetToDefault() {
        localStorage.removeItem(this.STORAGE_KEY_ITEMS); localStorage.removeItem(this.STORAGE_KEY_LOGS);
        localStorage.removeItem(this.STORAGE_KEY_AUDIT_PERM); localStorage.removeItem(this.STORAGE_KEY_REQUESTERS);
        localStorage.removeItem(this.STORAGE_KEY_OWNER_PIN); localStorage.removeItem("pea_warehouse_zeroed_v1");
        this.zeroAllQuantities();
        this.init();
    }
    getStats() {
        const items = this.getItems(); const totalSKU = items.length;
        let overCount = 0, fullCount = 0, goodCount = 0, normalCount = 0, lowCount = 0, minStockCount = 0;
        items.forEach(i => {
            const status = getItemStatus(i.currentQty, i.standard);
            if (status.key === "out_of_stock") minStockCount++; else if (status.key === "low") lowCount++;
            else if (status.key === "normal") normalCount++; else if (status.key === "good") goodCount++;
            else if (status.key === "full") fullCount++; else if (status.key === "over") overCount++;
        });
        return { totalSKU, overCount, fullCount, goodCount, normalCount, lowCount, outOfStockCount: minStockCount, alertCount: lowCount + minStockCount };
    }
}
window.getItemStatus = getItemStatus;
window.db = new StockDatabase();
