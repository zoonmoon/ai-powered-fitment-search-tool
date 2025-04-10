const socket = io();
const messages = {}
let prev_resp_id = ''
let loading = false 
const messageInput = document.getElementById('messageInput');

const chatMessagesContainer = document.querySelector('.chat-messages');

function scrollToBottom() {
    chatMessagesContainer.scrollTo({ top: chatMessagesContainer.scrollHeight, behavior: 'smooth' });
}

function isUserAtBottom() {
    return chatMessagesContainer.scrollHeight - chatMessagesContainer.clientHeight <= chatMessagesContainer.scrollTop + 50;
}


function sendMessage() {
  const msg = messageInput.value.trim();
  if (msg && !loading) {
    socket.emit('chatMessage', {socket_id: socket.id, query: msg, prev_resp_id});
    loading = true 
    messageInput.value = '';
  }
}

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

socket.on('chatMessage', (data) => {


  console.log(data) 

  if(messages[data.id]){
    const prevMessages = messages[data.id]
    messages[data.id]= [...prevMessages, data];
  }else{
    messages[data.id]= [data];
  }

  if(data.id.startsWith('myself')){
    scrollToBottom()
  }

  if(data.completed == true){
    prev_resp_id = data.resp_id
    loading = false 
    console.log(messages)
  }

  displayMessages()
  

});

function handleDislikeClick(){
  console.log("hello, posting...")
  window.parent.postMessage({ action: "initializeShopifyChat", text: "" }, "*");
}

function handleViewProductLinkClick(link){
  console.log("hello, posting...", link)
  window.parent.postMessage({ action: "initializeShopifyChat", text: link }, "*");
}


function displayMessages(){
  
  let isUserAtBottomBeforeAddingContent = isUserAtBottom() 

  document.querySelector('#messages').innerHTML = Object.values(messages).map((msgArr, index) => {
    return`
      <div ${index%2 == 0 ? 'class="by-myself"' : ''}>
        ${
          parseResponse(
            msgArr.sort((a, b) => a.sort_order - b.sort_order)
            .map(a => a.msg)
            .join('')
          )
        }
      </div>
    `
  }).join('') + (loading ? createBlinkingCursor() : '') 

  ;

  if(isUserAtBottomBeforeAddingContent) scrollToBottom() // after adding content as well

}

const parseResponse = (text, blink = false) => {
  // Replace newlines with <br>
  let formattedText = text.replace(/\n/g, '<br>');

  // Replace **text** with <strong>text</strong>
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Replace [Link](URL) with <a href="URL" target="_blank">Link</a>
  formattedText = formattedText.replace(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/g, '<a href="#" onclick="handleViewProductLinkClick(`$2`)">View Product</a>');

      return `
        <div class="product-card">
          <p>
            ${formattedText}
          </p>
        </div>
        
      `
  };


  function createBlinkingCursor() {
    return `
      <div  class="cursor"></div>
    `
  }