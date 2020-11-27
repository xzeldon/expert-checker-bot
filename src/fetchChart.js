const got = require('got')

const fs = require('fs-extra')

const { fetchToken } = require('./fetchToken')
const { createCache } = require('./cacher')

const fetchChart = async (vk) => {
  const grpInfo = await vk.api.call('groups.getById', { // Получаем информацию о количестве участников в группе кекспертов
    group_id: 'vkexperts',
    fields: 'members_count'
  })

  let experts_count = grpInfo[0].members_count // а вот и количество участников

  const token = await fetchToken()

  let params = { // Параметры для запроса к апи экспертов
    access_token: token,
    chart_type: 'total',
    limit: experts_count,
    v: '5.124'
  }

  let chart = await got('https://api.vk.com/method/experts.getChart', { // Сам запрос
    searchParams: params
  })

  let parsedChart = JSON.parse(chart.body) // Парсим полученную строку в JSON

  if (parsedChart.error) { // Очень крутая обработка ошибки.
    return vk.api.call('messages.send', {
      peer_ids: process.env.ADMIN_ID,
      message: `Произошла ошибка при запросе. Метод: exprets.getChart.\n\n Error: ${JSON.stringify(parsedChart.error)}`,
      random_id: 0
    })
  }

  fs.outputFile('db.json', JSON.stringify(parsedChart.response.chart, null, 4), (err) => { // Воруем весь топ кекспертов себе в джсон файлик
    if (err) console.error(err)
    createCache()
    return true
  })

  return 1 // ачё)
}

module.exports = fetchChart