import * as XLSX from 'xlsx'
import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const exportWorkbook = async (sheets, fileName) => {
  const workbook = XLSX.utils.book_new()

  sheets.forEach(({ name, rows }) => {
    const worksheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Message: 'No data available' }])
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31))
  })

  const downloadName = `${fileName}.xlsx`

  if (!Capacitor.isNativePlatform()) {
    XLSX.writeFile(workbook, downloadName)
    return
  }

  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' })
  const savedFile = await Filesystem.writeFile({
    path: downloadName,
    data,
    directory: Directory.Cache
  })

  await Share.share({
    title: downloadName,
    text: 'Save or share the exported report.',
    url: savedFile.uri,
    dialogTitle: 'Save report'
  })
}

export const numberValue = (value) => Number(value || 0)
