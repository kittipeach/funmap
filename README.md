# Spot Radar

แผนที่จุดสำหรับกลุ่มปิด เปิดบนมือถือ ติดตาม GPS ของผู้ใช้ แจ้งเตือนเมื่อเข้าใกล้จุด และให้สมาชิกเพิ่ม/แก้จุดร่วมกัน

- หน้าเว็บเป็นไฟล์ static ทั้งหมด วางบน GitHub Pages หรือโฮสต์ HTTPS ใดก็ได้
- ข้อมูลจุดและรายชื่อสมาชิกอยู่ใน Supabase หลัง Row Level Security ไม่มีข้อมูลจุดอยู่ใน repo นี้
- แผนที่ฐาน: OpenStreetMap ผ่าน CARTO basemaps, ค้นหาสถานที่: Nominatim

## ติดตั้ง

1. สร้างโปรเจกต์ Supabase แล้วรัน `supabase-setup.sql` (ไฟล์ส่วนตัว ไม่อยู่ใน repo) ใน SQL Editor
   หรือรัน `supabase/schema.sql` ถ้าต้องการเฉพาะโครงสร้างตาราง
2. Authentication > Sign In / Providers > Email: ปิด **Confirm email** (หรือจะตั้ง Custom SMTP แล้วเปิดไว้ก็ได้)
3. ใส่ Project URL และ anon / publishable key ใน `config.js`
4. เปิด GitHub Pages ให้ branch นี้ (Settings > Pages)

## สิทธิ์

| ใคร | ทำอะไรได้ |
|---|---|
| ไม่ได้ login หรืออีเมลไม่อยู่ในรายชื่อ | อ่านข้อมูลไม่ได้เลย สมัครไม่ได้ |
| สมาชิก | ดูทุกจุด เพิ่มจุด แก้ไขจุด เปลี่ยน Active/Inactive ย้ายหมุด ลบจุดที่ตัวเองเพิ่ม |
| ผู้ดูแล | ทุกอย่างของสมาชิก + ลบจุดของทุกคน + จัดการรายชื่ออีเมล |

anon key ใน `config.js` เปิดเผยได้ตามการออกแบบของ Supabase เพราะสิทธิ์ทั้งหมดบังคับด้วย RLS ในฐานข้อมูล
