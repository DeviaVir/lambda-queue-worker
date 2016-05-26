# lambda-watermarker

Watermarks image paths on S3 that come in via an SQS queue.

### Development testing

Install `npm install -g node-lambda`
locally, you can then adjust the `event.json` with how you expect your event to
arrive at your Lambda function.

You can test your function by running `node-lambda run` in your project
directory.

## Cost

Depending on the amount of time your finished lambda function needs to process
your queue items, you can make the following assumptions:

```
20.000.000 SQS items
128 MB memory
3 seconds execution time

$3.80 / month
```

```
200.000.000 SQS items
128 MB memory
3 seconds execution time

$39.80 / month
```

```
250.000.000 SQS items
128 MB memory
3 seconds execution time

$49.80 / month
```

```
250.000.000 SQS items
512 MB memory
10 seconds execution time

$63.97 / month
```

Feel free to calculate for your own use case, Matthew D Fuller created a
cost calculcator: http://blog.matthewdfuller.com/p/aws-lambda-pricing-calculator.html