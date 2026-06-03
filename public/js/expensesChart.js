window.createExpensesChart = function (canvasId, expenses, currency = "RUB") {
  const ctx = document.getElementById(canvasId);
  if (!ctx) {
    console.error("Canvas элемент не найден:", canvasId);
    return null;
  }

  console.log("📊 Создание диаграммы для расходов:", expenses);
  console.log("📊 Количество расходов:", expenses?.length || 0);

  // 🔹 ЗАЩИТА: проверяем что expenses не null/undefined
  if (!expenses || expenses.length === 0) {
    console.warn("⚠️ expenses пустой или null!");
    return null;
  }

  const payerExpenses = {};
  let total = 0;

  expenses.forEach((expense) => {
    // 🔹 ЗАЩИТА: проверяем что expense не null
    if (!expense) return;

    const amount = parseFloat(expense.amount) || 0;
    const payerName = expense.payer || expense.payer_name || "Неизвестно";

    console.log(
      `💰 Расход "${expense.name}": ${amount} ₽, оплатил: ${payerName}`,
    );

    if (!payerExpenses[payerName]) {
      payerExpenses[payerName] = 0;
    }
    payerExpenses[payerName] += amount;
    total += amount;
  });

  const labels = Object.keys(payerExpenses);
  const data = Object.values(payerExpenses);

  console.log("📈 Данные для диаграммы:", { labels, data, total });
  console.log("📊 Участников (плательщиков):", labels.length);

  const backgroundColors = [
    "#FF6384",
    "#36A2EB",
    "#FFCE56",
    "#4BC0C0",
    "#9966FF",
    "#FF9F40",
    "#8A2BE2",
    "#C9CBCF",
    "#20B2AA",
    "#FF69B4",
    "#00CED1",
    "#FF1493",
    "#32CD32",
    "#FFD700",
    "#DC143C",
  ];

  const chart = new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: backgroundColors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: "#fff",
          hoverOffset: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      animation: {
        duration: 1000,
        animateScale: true,
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 15,
            font: { size: 12, family: "Arial, sans-serif" },
            boxWidth: 15,
          },
        },
        tooltip: {
          backgroundColor: "rgba(0,0,0,0.8)",
          padding: 12,
          titleFont: { size: 14 },
          bodyFont: { size: 13 },
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.parsed || 0;
              const percentage =
                total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value.toFixed(2)} ${currency} (${percentage}%)`;
            },
          },
        },
      },
    },
  });

  return { chart, total, payerExpenses };
};
