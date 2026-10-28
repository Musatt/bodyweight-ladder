// ============================================================
//  肌肉圖
// ============================================================
//  全部來自 Wikimedia Commons，而且都是**公有領域或開放授權**，
//  所以可以合法用在這個公開的倉庫裡。
//
//  每一筆的授權和作者都是用維基的 API 查出來的，不是憑印象寫的
//  （action=query&prop=imageinfo&iiprop=extmetadata）。
//  而且每個網址都實際連過一次確認活著、也確認過檔案大小。
//
//  畫面上一定要把授權和作者標出來——CC BY-SA 要求標註，那是義務。
//
//  兩個已知的坑，改圖前先看：
//  1. **只能用原圖網址**（upload.wikimedia.org/wikipedia/commons/<x>/<xx>/<檔名>）。
//     縮圖網址（.../thumb/...）會被擋，回 HTTP 400。
//  2. 所以挑圖時要自己注意大小。原本臀／腿選到 Anatomography 的 3D GIF，
//     一張就 2MB，手機上三張要吃 6MB 流量，已經換成靜態圖。
// ============================================================

const U = 'https://upload.wikimedia.org/wikipedia/commons/';
const C = 'https://commons.wikimedia.org/wiki/File:';
const GRAY = 'Henry Vandyke Carter（Gray 氏解剖學 1918 年版）';

export const MUSCLES = {
  glute: {
    zh: '臀大肌', where: '屁股最大最外層的那塊',
    url: U + '9/91/Gluteus_maximus.png', page: C + 'Gluteus_maximus.png',
    licence: 'CC BY-SA 3.0', author: 'Wikimedia Commons 貢獻者',
  },
  quad: {
    zh: '股四頭肌', where: '大腿前側',
    url: U + 'b/b2/Gray430.png', page: C + 'Gray430.png',
    licence: '公有領域', author: GRAY,
  },
  ham: {
    zh: '腿後腱', where: '大腿後側',
    url: U + 'e/ed/Gray434.png', page: C + 'Gray434.png',
    licence: '公有領域', author: GRAY,
  },
  pec: {
    zh: '胸大肌', where: '胸口',
    url: U + 'd/de/Gray410.png', page: C + 'Gray410.png',
    licence: '公有領域', author: GRAY,
  },
  delt: {
    zh: '三角肌', where: '肩膀外側那塊圓的',
    url: U + '9/93/Deltoideus.png', page: C + 'Deltoideus.png',
    licence: 'CC BY-SA 3.0', author: 'Chrizz',
  },
  tri: {
    zh: '肱三頭肌', where: '上手臂後側',
    url: U + '8/83/Triceps_brachii.png', page: C + 'Triceps_brachii.png',
    licence: 'CC BY-SA 3.0', author: 'Wikimedia Commons 貢獻者',
  },
  lat: {
    zh: '背闊肌', where: '背部兩側最大的那片',
    url: U + '8/87/Latissimus.jpg', page: C + 'Latissimus.jpg',
    licence: '公有領域', author: 'Leo Testut',
  },
  erector: {
    zh: '豎脊肌', where: '脊椎兩側從上到下的長條肌肉',
    url: U + '1/1a/Gray389_-_Erector_spinae.png', page: C + 'Gray389_-_Erector_spinae.png',
    licence: '公有領域', author: GRAY,
  },
  multifidus: {
    zh: '多裂肌', where: '緊貼在脊椎上的深層小肌肉',
    url: U + '4/4f/Multifidi.png', page: C + 'Multifidi.png',
    licence: '公有領域', author: 'Uwe Gille',
  },
  iliopsoas: {
    zh: '髂腰肌', where: '從腰椎連到大腿骨，久坐最緊的那條',
    url: U + 'b/b2/Gray430.png', page: C + 'Gray430.png',
    licence: '公有領域', author: GRAY,
  },
  longuscolli: {
    zh: '頸長肌', where: '脖子前面、氣管後方的深層小肌肉',
    url: U + 'a/a6/Longus_colli.png', page: C + 'Longus_colli.png',
    licence: '公有領域', author: 'Uwe Gille',
  },
  trap: {
    zh: '斜方肌', where: '從後腦杓鋪到中背的一大片，上段就是肩頸痠的地方',
    url: U + '6/60/Trapezius.png', page: C + 'Trapezius.png',
    licence: 'CC BY-SA 3.0', author: 'Wikimedia Commons 貢獻者',
  },
  rectus: {
    zh: '腹直肌', where: '肚子正面，俗稱腹肌的那塊',
    url: U + '9/95/Rectus_abdominis.png', page: C + 'Rectus_abdominis.png',
    licence: 'CC BY-SA 3.0', author: 'Wikimedia Commons 貢獻者',
  },
  trunk: {
    zh: '腹橫肌', where: '包在肚子最裡面一層，像天然的束腹',
    url: U + 'd/d5/Transversus_abdominis.png', page: C + 'Transversus_abdominis.png',
    licence: '公有領域', author: 'Uwe Gille',
  },
  calf: {
    zh: '腓腸肌', where: '小腿肚',
    url: U + '4/4a/Gastrocnemius_muscle_-_posterior_view.png',
    page: C + 'Gastrocnemius_muscle_-_posterior_view.png',
    licence: 'CC BY-SA 2.1 JP', author: 'BodyParts3D／Anatomography',
  },
  serratus: {
    zh: '前鋸肌', where: '肋骨側面，像手指一樣的那幾條',
    url: U + '8/8d/SerratusMagnus.jpg', page: C + 'SerratusMagnus.jpg',
    licence: '公有領域', author: 'Leo Testut',
  },
};

export function muscle(key) { return MUSCLES[key]; }
