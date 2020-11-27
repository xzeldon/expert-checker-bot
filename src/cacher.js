/*
  Доставать данные из JSON файла, конечно, можно, но там десятки тысяч строк, парсить его при каждом запросе дороговато будет, правда? 
  Заводить целую базу данных? А может лучше засунем всё это прямо в оперативную память?
  Вообщем, кеширование с помощью Redis.
*/

const redis = require('redis')

const fs = require('fs-extra')
const path = require('path')

const client = redis.createClient();

client.on("error", function(error) {
  console.error(error);
});

const DB_PATH = path.join(__dirname, '..', 'db.json')

const createCache = async () => {
  try {
    fs.readJSON(DB_PATH, (err, db) => {
      if (err) console.error(err)

      for (user of Object.values(db)) {
        client.set(String(user.user_id), JSON.stringify({ // Не самый эффективный способ, но уже лучше, чем могло бы быть
          user_id: user.user_id,
          actions_count: user.actions_count,
          position: user.position,
          topic_name: user.topic_name
        }))
      }
      return console.log('All users cached from db')
    })
    
  } catch (err) {
    console.error(`An error occurred during caching:\n\n ${err}`);
  }
}

module.exports = {
  client, createCache, DB_PATH
}
