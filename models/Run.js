import mongoose from 'mongoose';

const runSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'กรุณาระบุชื่อรอบการวิ่ง'],
    trim: true
  },
  distance: {
    type: Number,
    required: [true, 'กรุณาระบุระยะทาง (กม.)']
  },
  duration: {
    type: Number, 
    required: [true, 'กรุณาระบุเวลาที่ใช้ (นาที)']
  },
  pace: {
    type: String, // เราจะเก็บเป็น "5:30" อะไรแบบนี้
    default: function() {
      // Logic คำนวณ Pace อัตโนมัติ: เวลา / ระยะทาง
      const minPerKm = this.duration / this.distance;
      const mins = Math.floor(minPerKm);
      const secs = Math.round((minPerKm - mins) * 60);
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
  },
  heartRate: {
    type: Number
  },
  date: {
    type: Date,
    default: Date.now
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  note: String
}, {
  timestamps: true // เก็บ createdAt, updatedAt ให้อัตโนมัติ
});

export default mongoose.model('Run', runSchema);