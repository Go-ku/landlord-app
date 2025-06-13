export async function uploadImages(files, progressCallback) {
    const uploadPromises = files.map((file, index) => {
      return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'your_cloudinary_preset'); // Replace with your Cloudinary preset
  
        const xhr = new XMLHttpRequest();
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded * 100) / event.total);
            progressCallback(percentComplete);
          }
        };
  
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const response = JSON.parse(xhr.responseText);
            resolve(response.secure_url);
          } else {
            reject(new Error('Upload failed'));
          }
        };
  
        xhr.onerror = () => reject(new Error('Upload error'));
        
        xhr.open('POST', 'https://api.cloudinary.com/v1_1/your_cloud_name/image/upload'); // Replace with your Cloudinary URL
        xhr.send(formData);
      });
    });
  
    return Promise.all(uploadPromises);
  }