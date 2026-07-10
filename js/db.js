let db = null;

async function loadDB() {
  console.log("Loading DB...");
  await new Promise(resolve => setTimeout(resolve, 800)); 
  console.log("FAKE DB LOADED OK");
}