import * as XLSX from 'xlsx'

export const exportWorkbook = (sheets, fileName) => {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'No data available' }])
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31))
  })

  XLSX.writeFile(workbook, `${fileName}.xlsx`)
}

export const numberValue = (value) => Number(value || 0)
