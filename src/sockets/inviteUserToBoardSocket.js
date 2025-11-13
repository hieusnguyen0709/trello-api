export const inviteUserToBoardSocket = (socket) => {
    // Lắng nghe sự kiện mà client emit lên có tên là: FE_USER_INVITED_TO_BOARD
    socket.on('FE_USER_INVITED_TO_BOARD', (invitation) => {
      // Emit ngược lại 1 sự kiện về cho mọi client khác (trừ chính người gửi request lên) và về phía FE check
      socket.broadcast.emit('BE_USER_INVITED_TO_BOARD', invitation)
    })
}