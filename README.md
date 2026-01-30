## Running the file
This is the same as other shoestring apps.

To run, you first have to make a .env file in the folder this opens in and add in the authenticaiton code I will send you

''' 
docker compose build
docker compose up -d
'''

The containers should be running 

## system
The data is stored locally on the device that runs this app. But using ngrok makes it available on https server online from any device (see below)

## After starting look up the ngrok Web UI

This is the address where the webui is hosted using ngrok.
After the stack is up, open
Go to:

```
http://localhost:4040
```

got to status tab/page and copy the first url. It will lokk like this:
https://simpatico-arletha-gymnocarpous.ngrok-free.dev/

This should alow people to access the site on a demo testing server.
