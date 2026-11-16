// 质保中心逻辑
(function () {
  "use strict";
  const $ = (s) => document.querySelector(s);

  let devices = load("warranty-devices", []);   // { sn, buyDate, channel, registeredAt }
  let repairs = load("warranty-repairs", []);   // { id, sn, type, desc, phone, status, createdAt }
  function load(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
  function save() {
    localStorage.setItem("warranty-devices", JSON.stringify(devices));
    localStorage.setItem("warranty-repairs", JSON.stringify(repairs));
  }

  $("#buyDate").value = new Date().toISOString().slice(0, 10);

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".tab").forEach(t =>
    t.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach(x => x.classList.toggle("active", x === t));
      ["register", "query", "repair"].forEach(id => $("#tab-" + id).hidden = id !== t.dataset.tab);
      if (t.dataset.tab === "repair") renderRepairs();
    }));

  /* ---------- 质保计算 ---------- */
  function warrantyOf(device) {
    const parsed = parseSn(device.sn);
    if (!parsed) return null;
    const months = parsed.line.warrantyMonths;
    const start = new Date(device.buyDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    const now = new Date();
    const totalDays = (end - start) / 864e5;
    const leftDays = Math.ceil((end - now) / 864e5);
    const usedPct = Math.min(100, Math.round((1 - leftDays / totalDays) * 100));
    return {
      parsed, start, end, leftDays, usedPct,
      status: leftDays <= 0 ? "out" : leftDays <= 30 ? "warn" : "on",
    };
  }

  const STATUS_TEXT = { on: "质保期内", warn: "即将到期", out: "已过保" };

  function deviceCard(device) {
    const w = warrantyOf(device);
    if (!w) return "";
    const barCls = w.status;
    return `
    <div class="wcard">
      <div class="wcard-head">
        <b>${w.parsed.line.emoji} ${w.parsed.line.name} · <span class="mono">${w.parsed.clean}</span></b>
        <span class="badge ${w.status}">${STATUS_TEXT[w.status]}</span>
      </div>
      <div class="w-rows">
        购买日期 <b>${device.buyDate}</b> · 渠道 <b>${device.channel}</b><br>
        质保期 <b>${w.parsed.line.warrantyMonths} 个月</b>（${device.buyDate} ~ ${w.end.toISOString().slice(0, 10)}）<br>
        覆盖范围：${w.parsed.line.cover}
      </div>
      <div class="progress"><i class="${barCls}" style="width:${w.usedPct}%"></i></div>
      <p class="progress-txt">${w.leftDays > 0 ? `剩余 ${w.leftDays} 天` : `已过期 ${-w.leftDays} 天`} · 已用 ${w.usedPct}%</p>
      ${w.status !== "out" ? `<div class="w-ops"><button data-repair="${device.sn}">🔧 在线报修</button></div>` : ""}
    </div>`;
  }

  /* ---------- 登记 ---------- */
  $("#regBtn").addEventListener("click", () => {
    const sn = $("#snInput").value.trim();
    const box = $("#regResult");
    box.hidden = false;

    const parsed = parseSn(sn);
    if (!parsed) {
      box.className = "result-box fail";
      box.innerHTML = "❌ 序列号格式不正确。格式：产品线前缀 + 年份 + 流水号，如 <b>KB2026-88341</b>";
      return;
    }
    if (!$("#buyDate").value) {
      box.className = "result-box fail";
      box.textContent = "❌ 请选择购买日期";
      return;
    }
    if (devices.some(d => parseSn(d.sn).clean === parsed.clean)) {
      box.className = "result-box fail";
      box.textContent = "❌ 该序列号已登记过质保";
      return;
    }

    devices.push({ sn: sn.toUpperCase(), buyDate: $("#buyDate").value, channel: $("#channel").value, registeredAt: new Date().toISOString() });
    save();
    const w = warrantyOf(devices[devices.length - 1]);
    box.className = "result-box ok";
    box.innerHTML = `✅ 登记成功！<b>${parsed.line.emoji} ${parsed.line.name}</b><br>
      质保 <b>${parsed.line.warrantyMonths} 个月</b>，有效期至 <b>${w.end.toISOString().slice(0, 10)}</b>`;
  });

  /* ---------- 查询 ---------- */
  function doQuery() {
    const sn = $("#qInput").value.trim();
    const box = $("#qResult");
    const parsed = parseSn(sn);
    if (!parsed) {
      box.innerHTML = `<div class="result-box fail">❌ 序列号格式不正确</div>`;
      return;
    }
    const device = devices.find(d => parseSn(d.sn).clean === parsed.clean);
    if (!device) {
      box.innerHTML = `<div class="result-box fail">未找到登记记录。如确为正品，请先在「登记质保」页登记。</div>`;
      return;
    }
    box.innerHTML = deviceCard(device);
  }
  $("#qBtn").addEventListener("click", doQuery);
  $("#qInput").addEventListener("keydown", e => e.key === "Enter" && doQuery());

  /* ---------- 报修 ---------- */
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-repair]");
    if (!btn) return;
    document.querySelector('[data-tab="repair"]').click();
    $("#repairForm").hidden = false;
    $("#repairSn").textContent = btn.dataset.repair;
  });

  $("#repairBtn").addEventListener("click", () => {
    const sn = $("#repairSn").textContent;
    if (!$("#faultDesc").value.trim() || !$("#faultPhone").value.trim()) {
      alert("请填写故障描述与联系方式");
      return;
    }
    repairs.unshift({
      id: "WX" + Date.now().toString().slice(-6),
      sn, type: $("#faultType").value,
      desc: $("#faultDesc").value.trim(),
      phone: $("#faultPhone").value.trim(),
      status: "已受理",
      createdAt: new Date().toISOString(),
    });
    save();
    renderRepairs();
    $("#repairForm").hidden = true;
    $("#faultDesc").value = "";
  });

  function renderRepairs() {
    $("#repairList").innerHTML = repairs.length ? repairs.map(r => `
      <div class="repair-row">
        <div class="top">
          <span class="mono">${r.id} · ${r.sn}</span>
          <span class="r-status">${r.status}</span>
        </div>
        <p class="desc">【${r.type}】${r.desc}<br>提交于 ${new Date(r.createdAt).toLocaleString("zh-CN")} · 客服将致电 ${r.phone}</p>
      </div>`).join("") : `<p class="empty">暂无报修记录。在「质保查询」页可对在保设备发起报修。</p>`;
  }
})();
