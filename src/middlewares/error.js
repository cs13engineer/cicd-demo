export const notFound = (req, res) => {
    res.status(404).send({ status: false, msg: 'Resource not found.' })
}

export const errorHandler = (error, req, res, next) => {
    console.error(error)
    if (res.headersSent) return next(error)
    res.status(error.statusCode || 500).send({
        status: false,
        msg: error.expose ? error.message : 'Internal server error.'
    })
}
