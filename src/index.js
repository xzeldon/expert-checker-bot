require('dotenv').config({ path: './config.env' })
const { VK } = require('vk-io')
const { HearManager } = require('@vk-io/hear')
const fs = require('fs-extra')

const { promisify } = require("util")

const { client, DB_PATH } = require('./cacher')
const fetchChart = require('./fetchChart')

fs.ensureFile(DB_PATH)

const getAsync = promisify(client.get).bind(client)

const vk = new VK({
	token: process.env.GROUP_TOKEN
});

fetchChart(vk) // Создание базы данных при первом запуске

setInterval(async () => { // Таймер обновления базы данных (дефолт раз в 24 часа)
	fetchChart(vk)

	return vk.api.call('messages.send', { // Уведомляем об успешном кешировании
		peer_ids: process.env.ADMIN_ID,
		message: `Кеширование успешно завершено!`,
		random_id: 0
	})
}, 3600000)

const hearManager = new HearManager()

const devMode = (context, next) => context.senderId === Number(process.env.ADMIN_ID) ? next() : 0

vk.updates.on('message', (context, next) => {
	process.env.MODE === 'development' ? devMode(context, next) : next()
})

vk.updates.on('message_new', hearManager.middleware)

const generateStats = (parsedUser) => {
	return `
	🧐 ID: @id${parsedUser.user_id}
		🔥 Тематика: ${parsedUser.topic_name}
		🏆 Место в топе: ${parsedUser.position}
	`
}

hearManager.hear('кеш', async (context) => { // При необходимости можем обновлять нашу базу данных в любой момент. Не рекомендую делать это слишком часто, так как капча.
	if (context.senderId === Number(process.env.ADMIN_ID)) {
		await fetchChart(vk)
		return vk.api.call('messages.send', {
			peer_ids: process.env.ADMIN_ID,
			message: `Кеширование успешно завершено!`,
			random_id: 0
		})
	}

	return context.send({ sticker_id: Number(process.env.STICKER_ID) }) // Если пользователь не мы сами (админ), то отправляем дружелюбный стикер.
})

hearManager.hear(/^(?:чек)\s?([0-9]+)?$/i, async (context) => {
	let user
	let userId

	context.$match[1] ? userId = context.$match[1] : userId = context.senderId
	context.hasReplyMessage ? userId = context.replyMessage.senderId : undefined
	
	if (context.hasForwards) {
		context.forwards.length === 1 ? userId = context.forwards[0].senderId : undefined

		if (context.forwards.length > 1) {
			let list = `` // переменная для формирования сообщения
			let ids = [] // список всех айдишников
			for (let i = 0; i < context.forwards.length; i++) { // пушим найденные айдишники в ids
				ids.push(context.forwards[i].senderId)
			}

			ids = [...new Set(ids)] // удаляем повторяющиеся айдишники
			
			for (let i = 0; i < ids.length; i++) {
				let user

				context.append = (_list) => list += _list+"\n"

				user = await getAsync(ids[i])
				
				if (user) {
					user = JSON.parse(user)
					context.append(generateStats(user))
				} else {
					context.append(`
					🧐 ID: @id${ids[i]}
					❌ Не эксперт
					`)
				}
			}
			return context.send(list, {
				disable_mentions: 1
			})
		}
	}

	if (context.replyMessage) { // если додик отправляет нам группу, а не юзера
		if (context.replyMessage.senderType == 'group') {
			context.send({ sticker_id: Number(process.env.STICKER_ID) }) // то отправляем ему дружелюбный стикер <3
			return
		}
	}

	try {
		user = await getAsync(userId)
	} catch (err) {
		console.error(err)
	}

	if (!user) {
		context.send('Не эксперт')
		return
	}

	user = JSON.parse(user)
	context.send(generateStats(user), {
		disable_mentions: 1
	})
});

vk.updates.start().catch(console.error)