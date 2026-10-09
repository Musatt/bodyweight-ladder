// ============================================================
//  Supabase 連線設定
// ============================================================
//  下面這兩個值是「公開金鑰」，不是密碼，放進版控是正確的做法。
//  Supabase 自己的文件也是這樣教：網頁必須帶著它才連得上資料庫，
//  所以任何人按「檢視原始碼」都看得到，這是設計上就預期的。
//
//  真正的防護在資料庫那一端：每張表都開了 RLS（Row Level Security，
//  逐列安全規則），規則寫的是「只有登入者本人的 user_id 才讀得到那一列」。
//  所以別人拿到這把金鑰也只能連上來，看不到你的任何一筆紀錄。
//  規則的完整內容在 supabase/schema.sql。
// ============================================================

export const SUPABASE_URL = 'https://lvhfwadbaxniuyryrngz.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_Ps-AVHlvlXk8HavZdshYmw_19nZJdoY';
