import request from 'supertest'
import { expect } from 'chai'
import app from '../src/app.js'

describe('GET /', () => {
    it('should return the home page with 200', async () => {
        const response = await request(app).get('/')

        expect(response.status).to.equal(200)
        expect(response.type).to.match(/html|text\/html/)
    })

    it('should return the user list with sanitized data', async () => {
        const response = await request(app).get('/users')

        expect(response.status).to.equal(200)
        expect(response.body.status).to.equal(true)
        expect(response.body.msg).to.equal('data fetched successfully')
        expect(response.body.data).to.be.an('array').that.is.not.empty
        expect(response.body.data[0]).to.include({
            username: 'johnd',
            name: 'John Doe',
            designation: 'Developer'
        })
        expect(response.body.data[0]).to.have.property('hobies').that.deep.equals(['Learning new things'])
        expect(response.body.data[0]).to.not.have.property('password')
    })
})
