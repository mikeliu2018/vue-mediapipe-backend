const { PrismaClient } = require('@prisma/client');

module.exports = {
  async record_pose_landmarks (json) {    
    const prisma = new PrismaClient();
    // insert to MySQL                                
    // run inside `async` function
    try {    
      const items = [];
      json.poseLandmarks.map(item => {
        // item.timesteamp = json.timesteamp;
        // items.push(item);
        items.push({
          x: item.x,
          y: item.y,
          z: item.z,
          visibility: item.visibility,
          timesteamp: json.timesteamp
        });
      });

      if(items.length > 0) {
        const result = await prisma.pose_landmarks.createMany({ data: items });
        // console.log("result", result);
        return result;
      }
    } finally {
      await prisma.$disconnect();
    }
  }
}