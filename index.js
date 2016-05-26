'use strict';

/**
 * Module dependencies
 */
var AWS = require('aws-sdk'),
    Promise = require('bluebird'),
    s3 = new AWS.S3({endpoint: 's3-us-west-2.amazonaws.com'}),
    path = require('path'),
    fs = require('fs'),
    gm = require('gm').subClass({ imageMagick: true }),
    rmdir = require('rimraf');

var bucket = process.env.BUCKET || 'pebble-lambda-watermark-demo';

/**
 * Manage pr
 * @static
 * @class pr
 */
var pr = {};

(function(pr) {

  /**
   * Download image from S3 and save locally to a working directoy
   * @param  {String} s3Path  Path on s3 bucket
   * @return {String} savedPath Path on local drive       
   */
  pr.download = function download(s3Path) {
  	var imageName = path.basename(s3Path).slice(0, (path.basename(s3Path).length-4));
    var savedPath = '/tmp/';

    console.log('path', s3Path);
    console.log('bucket', bucket);
    console.log('savedPath', savedPath);

    return Promise.resolve().then(function() {
      var god = Promise.pending();

      var file = fs.createWriteStream(savedPath + 'source.jpg');
      
      s3.getObject({
        Bucket: bucket,
        Key: s3Path
      })
        .on('httpData', function(chunk) { file.write(chunk); })
        .on('httpDone', function() { file.end(); })
        .send(function(err) {
          if(err) {
            return god.reject(err);
          }

          console.log('[pr.download] Downloaded file to ' + savedPath + 'source.jpg');
          return god.resolve();
        });

      return god.promise;
    }).catch(function(err) {
      console.error('[pr.download] Broke down on an error', err);
      return Promise.reject(err);
    }).delay(500).then(function() {
      return [savedPath, imageName];
    });
  };

  /**
   * Generate watermark and save in path folder
   * @param {String} wdPath
   * @return {String} wdPath
   */
  pr.watermark = function watermark(attrs) {
  	var watermarkPath = __dirname + '/images/';
    return Promise.resolve().then(function() {
      var god = Promise.pending();

      console.log('[pr.watermark] Create share watermark');

      gm(attrs[0] + 'source.jpg')
        .composite(watermarkPath + 'watermark-black.png')
        .geometry('+50+50')
         .write(attrs[0] + attrs[1] + '.jpg', function(err) {
            if (err) {
              console.error('[pr.watermark] exit error', err);
              return god.reject();
            }

            console.log('[pr.watermark] Creation successful');
            rmdir(attrs[0] + 'source.jpg', function() {
	            return god.resolve(attrs[0] + attrs[1] + '.jpg'); // DONE
	          });
         });

      return god.promise;
    }).then(function() {
      var god = Promise.pending();

      console.log('[pr.watermark] Create share watermark');

      gm(attrs[0] + attrs[1] + '.jpg')
        .composite(watermarkPath + 'watermark-white.png')
        .geometry('+1700+1000')
         .write(attrs[0] + attrs[1] + '.jpg', function(err) {
            if (err) {
              console.error('[pr.watermark] exit error', err);
              return god.reject();
            }

            console.log('[pr.watermark] Creation successful');
            return god.resolve(attrs[0] + attrs[1] + '.jpg');
         });

      return god.promise;
    }).catch(function(err) {
      console.error('[pr.watermark] Generating share image failed', err);
      return Promise.reject(err);
    }).then(function(share) {
      console.log('[pr.watermark] Generated', share);
      return attrs[0] + attrs[1] + '.jpg';
    });
  };

  /**
   * Upload watermarked image to s3 folder and remove working directory
   * @param  {String} wdPath 
   * @return {Promise} resolve/reject
   */
  pr.upload = function upload(filename) {
    console.log('starting upload..', filename, bucket, 'watermarked/' + filename.split('/')[filename.split('/').length-1]);
    return Promise.resolve().then(function() {
      var god = Promise.pending();
      if(fs.existsSync(filename)) {
        var readStream = fs.createReadStream(filename);

        var params = {
          Bucket: bucket,
          Key: 'watermarked/' + filename.split('/')[filename.split('/').length-1],
          ContentType: 'image/jpg',
          CacheControl: 'max-age=31536000', // 1 year (60 * 60 * 24 * 365)
          Body: readStream
        };

        // Upload to s3
        s3.upload(params).send(function(err) {
          if(err) {
            console.log('[pr.upload] failed', err);
            return god.reject(err);
          }

          console.log('[pr.upload] Uploaded ' + filename + ' to ', bucket + '/watermarked/' + filename.split('/')[filename.split('/').length-1]);
          
          // Clean up
          rmdir(filename, function() {
            return god.resolve(); // DONE
          });
        });
      }
      else {
        return Promise.reject('No actual share image generated');
      }

      return god.promise;
    }).then(function() {
      return Promise.resolve();
    }).catch(function(err) {
      console.log('[pr.upload] an error occurred', err);
    });
  };
})(pr);


console.log('Loading function');

exports.handler = (event, context, callback) => {
  Promise.resolve().then(function() {
  	if('path' in event && event.path) {
  		return Promise.resolve().then(function() {
        return pr.download(event.path).then(function(path) { // download
          return pr.watermark(path); // generate watermarked image
        }).then(function(path) {
          return pr.upload(path); // upload to s3
        });
      });
		}
    else {
      return Promise.reject('No path!');
    }
  }).then(function() {
    return callback(null, 'Success!');
  }).catch(function(err) {
    return callback(err);
  });
};