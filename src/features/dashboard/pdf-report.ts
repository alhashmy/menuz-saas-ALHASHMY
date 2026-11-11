import type { Order } from '@/features/orders/types'

const statusLabels: Record<Order['status'], string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز',
  completed: 'مكتمل',
  cancelled: 'ملغي',
}

function addCell(row: HTMLTableRowElement, text: string) {
  const cell = document.createElement('td')
  cell.textContent = text
  cell.style.padding = '9px 7px'
  cell.style.borderBottom = '1px solid #e5e7eb'
  row.appendChild(cell)
}

export async function exportOrdersPdf({
  restaurantName,
  orders,
  label,
  filename,
}: {
  restaurantName: string
  orders: Order[]
  label: string
  filename: string
}) {
  const { default: html2pdf } = await import('html2pdf.js')
  const report = document.createElement('section')
  report.dir = 'rtl'
  report.lang = 'ar'
  report.style.cssText =
    'position:fixed;left:-10000px;top:0;width:794px;padding:36px;background:#fff;color:#111827;font-family:Arial, Tahoma, sans-serif;direction:rtl;'

  const heading = document.createElement('h1')
  heading.textContent = `تقرير الطلبات — ${restaurantName}`
  heading.style.cssText = 'margin:0;font-size:24px;font-weight:700;'
  report.appendChild(heading)

  const period = document.createElement('p')
  period.textContent = label
  period.style.cssText = 'margin:8px 0 24px;color:#4b5563;font-size:14px;'
  report.appendChild(period)

  const revenue = orders.reduce(
    (sum, order) => sum + Number(order.total_amount || 0),
    0
  )
  const summary = document.createElement('div')
  summary.textContent = `إجمالي الطلبات: ${orders.length}  |  إجمالي المبيعات: ${revenue.toLocaleString('ar-IQ')} د.ع`
  summary.style.cssText =
    'margin-bottom:20px;padding:12px 14px;border-radius:8px;background:#f3f4f6;font-weight:700;'
  report.appendChild(summary)

  const table = document.createElement('table')
  table.style.cssText =
    'width:100%;border-collapse:collapse;font-size:12px;text-align:right;'
  const header = table.insertRow()
  ;['رقم', 'الزبون', 'الهاتف', 'الحالة', 'المبلغ', 'الوقت'].forEach((value) => {
    const cell = document.createElement('th')
    cell.textContent = value
    cell.style.cssText =
      'padding:10px 7px;background:#111827;color:#fff;text-align:right;'
    header.appendChild(cell)
  })
  orders.forEach((order) => {
    const row = table.insertRow()
    addCell(row, `#${order.daily_sequence}`)
    addCell(row, order.customer_name)
    addCell(row, order.customer_phone)
    addCell(row, statusLabels[order.status])
    addCell(row, `${Number(order.total_amount).toLocaleString('ar-IQ')} د.ع`)
    addCell(
      row,
      new Date(order.created_at).toLocaleString('ar-IQ', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    )
  })
  report.appendChild(table)
  document.body.appendChild(report)

  try {
    await html2pdf()
      .set({
        margin: 8,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(report)
      .save()
  } finally {
    report.remove()
  }
}
