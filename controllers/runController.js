import Run from '../models/Run.js';
import PDFDocument from 'pdfkit';

// @desc    บันทึกการวิ่งใหม่
// @route   POST /api/runs
export const createRun = async (req, res) => {
  console.log('--- ข้อมูลที่ส่งมาถึง Backend: ---');
  console.log(req.body); // ดูว่า JSON มันหลุดมาถึงนี่ไหม
  
  try {
    req.body.user = req.user.id; // ผูกการวิ่งนี้กับ User ที่ Login อยู่
    const newRun = await Run.create(req.body);
    res.status(201).json({ success: true, data: newRun });
  } catch (error) {
    console.log('❌ เกิด Error ตอน Save ลง Mongo:', error.message); // Log ดู Error จริงๆ ใน Terminal
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    ดึงข้อมูลการวิ่งทั้งหมด
// @route   GET /api/runs
export const getRuns = async (req, res) => {
  try {
    const runs = await Run.find({ user: req.user.id }).sort({ date: -1 }); // เรียงจากล่าสุดไปเก่าสุด
    res.status(200).json({ success: true, count: runs.length, data: runs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    วิเคราะห์โอกาสจบ Half-Marathon Sub 2 (Pace 5:41 หรือเร็วกว่า)
// @route   GET /api/runs/analysis

export const analyzeHalfMarathon = async (req, res) => {
  try {
    const runs = await Run.find({ user: req.user.id }).limit(10).sort({ date: -1 }); // ดึง 10 รอบล่าสุดมาดูเทรนด์
    
    if (runs.length < 3) {
      return res.status(400).json({ success: false, message: 'กรุณาส่งข้อมูลการวิ่งอย่างน้อย 3 รอบเพื่อวิเคราะห์เทรนด์' });
    }

    // 1. คำนวณค่าเฉลี่ย Pace และ Heart Rate
    const avgPace = runs.reduce((acc, r) => acc + (r.duration / r.distance), 0) / runs.length;
    const avgHR = runs.reduce((acc, r) => acc + (r.heartRate || 0), 0) / runs.length;
    const totalDistance = runs.reduce((acc, r) => acc + r.distance, 0);

    // 2. วิเคราะห์เทรนด์ (เปรียบเทียบ 3 รอบล่าสุด กับ 3 รอบก่อนหน้า)
    const latest3Pace = (runs[0].duration / runs[0].distance + runs[1].duration / runs[1].distance + runs[2].duration / runs[2].distance) / 3;
    const previous3Pace = (runs[3]?.duration / runs[3]?.distance || latest3Pace); 
    const trend = latest3Pace < previous3Pace ? "Faster 📈" : "Stable/Slower 📉";

    // 3. คำนวณความน่าจะเป็น (Probability Score)
    const targetPace = 5.68; // Pace 5:41
    let probability = 0;
    
    if (avgPace <= targetPace) probability += 60;
    else if (avgPace <= targetPace + 0.5) probability += 40;
    
    if (trend === "Faster 📈") probability += 20;
    if (avgHR < 155 && avgHR > 0) probability += 20; // ถ้า HR ไม่สูงเกินไป แปลว่ายังมีแรงเหลือ

    res.status(200).json({
      success: true,
      data: {
        summary: {
          avgPace: formatPace(avgPace),
          avgHeartRate: Math.round(avgHR),
          totalVolumeKm: totalDistance
        },
        insight: {
          performanceTrend: trend,
          sub2Probability: `${probability}%`,
          status: getStatus(probability),
        },
        recommendation: generateRecommendation(avgPace, targetPace, avgHR)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    ดึงสถิติการวิ่งรายเดือน (Monthly Stats)
// @route   GET /api/runs/stats
// @access  Private
export const getMonthlyStats = async (req, res) => {
  try {
    // 🔗 เริ่มทำ Aggregation Pipeline
    const stats = await Run.aggregate([
      // Stage 1: เลือกเฉพาะข้อมูลของ "เรา" (เหมือน .find())
      { $match: { user: req.user._id } }, 
      
      // Stage 2: จัดกลุ่มตาม "เดือนและปี" ของวันที่วิ่ง
      {
        $group: {
          _id: {
            year: { $year: '$date' }, // ดึงปีออกมา
            month: { $month: '$date' } // ดึงเดือนออกมา
          },
          totalDistance: { $sum: '$distance' }, // รวมระยะทางทั้งหมดในเดือนนั้น
          avgPace: { $avg: { $divide: ['$duration', '$distance'] } }, // หา Pace เฉลี่ยของเดือน
          count: { $sum: 1 } // นับจำนวนครั้งที่วิ่งในเดือนนั้น
        }
      },
      
      // Stage 3: จัดเรียงผลลัพธ์ตามปีและเดือน (ใหม่ไปเก่า)
      { $sort: { '_id.year': -1, '_id.month': -1 } }
    ]);

    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export const generateReport = async (req, res) => {
  try {
    // 1. ดึงข้อมูลการวิ่งทั้งหมดของ User คนนี้ (เรียงจากใหม่ไปเก่า)
    const runs = await Run.find({ user: req.user.id }).sort({ date: -1 });

    if (!runs || runs.length === 0) {
      return res.status(404).json({ message: 'ยังไม่มีข้อมูลการวิ่งเลยครับ ไปวิ่งก่อนนะ!' });
    }

    // 2. สร้างเอกสาร PDF ใหม่
    const doc = new PDFDocument({ margin: 50 });

    // 3. ตั้งค่า Header เพื่อบอกว่า "นี่คือไฟล์ PDF ให้ดาวน์โหลดนะ"
    res.setHeader('Content-Type', 'application/pdf');
    // ตั้งชื่อไฟล์ตอนโหลด (เช่น run_report_Kiatisak.pdf)
    res.setHeader('Content-Disposition', `attachment; filename=run_report_${req.user.name.replace(/\s+/g, '_')}.pdf`);

    // 4. ท่าไม้ตาย: ต่อท่อ (Pipe) ข้อมูลจาก PDF ลงไปที่ Response โดยตรง
    doc.pipe(res);

    // ==========================================
    // 🎨 5. เริ่มวาดเนื้อหาลง PDF
    // ==========================================
    
    // หัวกระดาษ
    doc.fontSize(24).text('Run Club - Training Report', { align: 'center' });
    doc.moveDown();
    
    // ข้อมูลนักวิ่ง
    doc.fontSize(14).text(`Athlete: ${req.user.name}`);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    // เส้นคั่น
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // รายการวิ่ง (วนลูปสร้างบรรทัด)
    doc.fontSize(12);
    runs.forEach((run, index) => {
      // สมมติว่ามีเป้าหมายซ้อมทำ Sub-2 หรือ Sub-1 เราก็เอาสถิติมาโชว์ตรงนี้เลย
      const pace = (run.duration / run.distance).toFixed(2); 
      
      doc.text(`#${index + 1} | Date: ${new Date(run.date).toLocaleDateString()}`);
      doc.text(`Distance: ${run.distance} km  |  Duration: ${run.duration} mins  |  Avg Pace: ${pace} min/km`);
      doc.moveDown(0.5);
    });

    // เส้นคั่นปิดท้าย
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.text(`Total Runs Logged: ${runs.length}`, { align: 'right' });

    // 6. ปิดเอกสาร (ส่งสัญญาณว่าสตรีมจบแล้ว)
    doc.end();

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// --- Helper Functions ---
function formatPace(paceDecimal) {
  const mins = Math.floor(paceDecimal);
  const secs = Math.round((paceDecimal - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getStatus(prob) {
  if (prob >= 80) return "🔥 พร้อมแข่งแล้ว! Sub 2 อยู่แค่เอื้อม";
  if (prob >= 50) return "🏃‍♂️ มาถูกทางแล้ว ซ้อมต่อเนื่องอีกนิด";
  return "🐢 เน้นเก็บระยะทาง (Base Mileage) เพิ่มเติม";
}

function generateRecommendation(pace, target, hr) {
  if (pace > target + 1) return "เน้นวิ่ง Tempo เพื่อเพิ่มความอึดของปอด";
  if (hr > 165) return "Pace ดีแล้ว แต่หัวใจทำงานหนักไป ลองฝึก Zone 2 บ้าง";
  return "รักษาวินัยการซ้อมแบบนี้ไว้ มีลุ้นแน่นอน!";
}