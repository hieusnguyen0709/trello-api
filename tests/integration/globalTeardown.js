module.exports = async () => {
    await global.__MONGOINSTANCE.stop()
}