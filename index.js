const fs = require("fs");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const zlib = require("zlib");
const readline = require("readline");

const args = process.argv.slice(2);
const currentUsername = args.find((arg) => arg.startsWith("--username="));
const username = currentUsername ? currentUsername.split("=")[1] : "No Name";

console.log(`Welcome to the File Manager, ${username}!`);

let currentDirectory = os.homedir();
console.log(`You are currently in ${currentDirectory}`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

rl.prompt();

const goUp = () => {
  const parentDir = path.resolve(currentDirectory, "..");
  if (parentDir !== currentDirectory) {
    currentDirectory = parentDir;
    console.log(`You are currently in ${currentDirectory}`);
  }
};

const changeDirectory = (targetPath) => {
  const newDir = path.resolve(currentDirectory, targetPath);
  if (fs.existsSync(newDir) && fs.lstatSync(newDir).isDirectory()) {
    currentDirectory = newDir;
    console.log(`You are currently in ${currentDirectory}`);
  } else {
    console.log("Operation failed");
  }
};

const listDirectory = () => {
  fs.readdir(currentDirectory, { withFileTypes: true }, (err, entities) => {
    if (err) {
      console.log("Operation failed");
      return;
    }

    const entityList = entities.map((entity) => ({
      name: entity.name,
      type: entity.isDirectory() ? "Directory" : "File",
    }));

    entityList.sort((a, b) => a.name.localeCompare(b.name));

    console.table(entityList);
  });
};

const readFile = (filePath) => {
  const fullPath = path.resolve(currentDirectory, filePath);
  const readStream = fs.createReadStream(fullPath, "utf-8");

  readStream.on("data", (chunk) => process.stdout.write(chunk));
  readStream.on("end", () => console.log(""));
  readStream.on("error", () => console.log("Operation failed"));
};

const addFile = (fileName) => {
  const filePath = path.join(currentDirectory, fileName);
  fs.writeFile(filePath, "", (err) => {
    if (err) {
      console.log("Operation failed");
    }
  });
};

const renameFile = (filePath, newFileName) => {
  const oldPath = path.resolve(currentDirectory, filePath);
  const newPath = path.resolve(currentDirectory, newFileName);

  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      console.log("Operation failed");
    }
  });
};

const copyFile = (sourcePath, destinationPath) => {
  const source = path.resolve(currentDirectory, sourcePath);
  const destination = path.resolve(
    currentDirectory,
    destinationPath,
    path.basename(source)
  );

  const readStream = fs.createReadStream(source);
  const writeStream = fs.createWriteStream(destination);

  readStream
    .pipe(writeStream)
    .on("finish", () => console.log("File copied successfully"))
    .on("error", () => console.log("Operation failed"));
};

const moveFile = (sourcePath, destinationPath) => {
  copyFile(sourcePath, destinationPath);
  fs.unlink(path.resolve(currentDirectory, sourcePath), (err) => {
    if (err) {
      console.log("Operation failed");
    }
  });
};

const deleteFile = (filePath) => {
  const fullPath = path.resolve(currentDirectory, filePath);
  fs.unlink(fullPath, (err) => {
    if (err) {
      console.log("Operation failed");
    }
  });
};

const getOsInfo = (option) => {
  switch (option) {
    case "--EOL":
      console.log(JSON.stringify(os.EOL));
      break;
    case "--cpus":
      const cpus = os.cpus();
      console.log(`Total CPUs: ${cpus.length}`);
      cpus.forEach((cpu, index) => {
        console.log(`CPU ${index + 1}: ${cpu.model}, ${cpu.speed / 1000} GHz`);
      });
      break;
    case "--homedir":
      console.log(os.homedir());
      break;
    case "--username":
      console.log(os.userInfo().username);
      break;
    case "--architecture":
      console.log(os.arch());
      break;
    default:
      console.log("Invalid input");
  }
};

const calculateHash = (filePath) => {
  const fullPath = path.resolve(currentDirectory, filePath);
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(fullPath);

  stream.on("data", (data) => hash.update(data));
  stream.on("end", () => console.log(hash.digest("hex")));
  stream.on("error", () => console.log("Operation failed"));
};

const compressFile = (source, destination) => {
  const sourcePath = path.resolve(currentDirectory, source);
  const destPath = path.resolve(currentDirectory, destination);

  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destPath);
  const brotli = zlib.createBrotliCompress();

  readStream
    .pipe(brotli)
    .pipe(writeStream)
    .on("finish", () => {
      console.log("File compressed successfully");
    })
    .on("error", () => {
      console.log("Operation failed");
    });
};

const decompressFile = (source, destination) => {
  const sourcePath = path.resolve(currentDirectory, source);
  const destPath = path.resolve(currentDirectory, destination);

  const readStream = fs.createReadStream(sourcePath);
  const writeStream = fs.createWriteStream(destPath);
  const brotli = zlib.createBrotliDecompress();

  readStream
    .pipe(brotli)
    .pipe(writeStream)
    .on("finish", () => {
      console.log("File decompressed successfully");
    })
    .on("error", () => {
      console.log("Operation failed");
    });
};

rl.on("line", (input) => {
  const [command, ...args] = input.trim().split(" ");

  switch (command) {
    case "up":
      goUp();
      break;
    case "cd":
      changeDirectory(args[0]);
      break;
    case "ls":
      listDirectory();
      break;
    case "cat":
      readFile(args[0]);
      break;
    case "add":
      addFile(args[0]);
      break;
    case "rn":
      renameFile(args[0], args[1]);
      break;
    case "cp":
      copyFile(args[0], args[1]);
      break;
    case "mv":
      moveFile(args[0], args[1]);
      break;
    case "rm":
      deleteFile(args[0]);
      break;
    case "os":
      getOsInfo(args[0]);
      break;
    case "hash":
      calculateHash(args[0]);
      break;
    case "compress":
      compressFile(args[0], args[1]);
      break;
    case "decompress":
      decompressFile(args[0], args[1]);
      break;
    case ".exit":
      rl.close();
      break;
    default:
      console.log("Invalid input");
  }

  console.log(`You are currently in ${currentDirectory}`);
  rl.prompt();
}).on("close", () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  process.exit(0);
});
