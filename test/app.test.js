import request from 'supertest'
import { expect } from 'chai'
import app from '../src/app.js'
import users from '../data/index.js';


describe('GET /', () => {
    const userList = [
        {
            username: "johnd",
            name: "John Doe",
            designation: "Developer",
            hobies: ["Learning new things"]
        }
    ]
    it('it should return 200', async () => {
        const response = await request(app).get('/')

        expect(response.status).to.equal(200)
    });

    //get users test
    it("it should return the user-list", async () => {
        const response = await request(app).get('/users')
        expect(response.statusCode).to.equal(200)
        expect(response.body.status).to.equal(true)
        expect(response.body.msg).to.equal("data fetched successfully")
        expect(response.body.data).to.be.an('array')
    });
})
