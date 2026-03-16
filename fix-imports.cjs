const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src/pages/master/students/modals');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes("import Modal from '../../../components/ui/Modal'")) {
    content = content.replace("import Modal from '../../../components/ui/Modal'", "import Modal from '../../../../components/ui/Modal'");
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', file);
  } else {
    console.log('No match', file);
  }
});
