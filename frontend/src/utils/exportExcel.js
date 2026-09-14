export const exportWorkbook = async (sheets, fileName) => {
  // Excel and native sharing libraries are large; only download them when the
  // user actually exports instead of putting them on the report's critical path.
  const [XLSX, { Capacitor }] = await Promise.all([
    import('xlsx'),
    import('@capacitor/core')
  ])
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

  const [{ Directory, Filesystem }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share')
  ])

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
