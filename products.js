// 产品线与质保政策（原创虚构）
// SN 规则：前缀-年份-流水号，如 KB2026-88341
const PRODUCT_LINES = {
  KB: { name: "机械键盘", emoji: "⌨️", warrantyMonths: 24, cover: "轴体/主板/灯效故障" },
  HP: { name: "头戴耳机", emoji: "🎧", warrantyMonths: 18, cover: "单元/降噪模块/头梁" },
  SP: { name: "蓝牙音箱", emoji: "🔊", warrantyMonths: 18, cover: "喇叭/电池/充电口" },
  WM: { name: "智能手表", emoji: "⌚", warrantyMonths: 12, cover: "屏幕/传感器/电池" },
};

function parseSn(sn) {
  const clean = String(sn).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = clean.match(/^([A-Z]{2})(20\d{2})(\d{3,6})$/);
  if (!m) return null;
  const line = PRODUCT_LINES[m[1]];
  if (!line) return null;
  return { prefix: m[1], year: +m[2], serial: m[3], line, clean };
}
