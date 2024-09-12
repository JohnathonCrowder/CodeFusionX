document.getElementById('clearButton').addEventListener('click', function() {
    document.getElementById('textbox').value = '';
  });

  document.getElementById('copyButton').addEventListener('click', function() {
    const textbox = document.getElementById('textbox');
    textbox.select();
    document.execCommand('copy');
  });

  document.getElementById('uploadButton').addEventListener('click', function() {
    document.getElementById('fileInput').click();
  });

  document.getElementById('uploadDirButton').addEventListener('click', function() {
    document.getElementById('dirInput').click();
  });

  document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      document.getElementById('textbox').value = e.target.result;
    };

    reader.readAsText(file);
  });

  document.getElementById('dirInput').addEventListener('change', async function(event) {
    try {
      const files = event.target.files;
      const textbox = document.getElementById('textbox');
      const acceptedTypes = getAcceptedTypes();
      const fileListItems = document.getElementById('fileListItems');
      const skippedFileListItems = document.getElementById('skippedFileListItems');

      textbox.value = '';
      fileListItems.innerHTML = '';
      skippedFileListItems.innerHTML = '';

      const tree = {};
      const skippedFiles = [];
      const largeFiles = [];

      for (const file of files) {
        const fileExtension = '.' + file.name.split('.').pop().toLowerCase();

        if (acceptedTypes.includes(fileExtension)) {
          try {
            const fileContent = await readFileAsText(file);
            if (fileContent.length > 2 * 1024 * 1024) { // If file is larger than 2MB
              largeFiles.push(file);
            } else {
              try {
                localStorage.setItem(file.webkitRelativePath, fileContent);
              } catch (storageError) {
                console.warn(`Failed to store ${file.name} in localStorage: ${storageError}`);
                largeFiles.push(file);
              }
            }
            addToTree(tree, file);
          } catch (error) {
            console.error(`Error reading file ${file.name}: ${error}`);
            skippedFiles.push(file);
          }
        } else {
          skippedFiles.push(file);
        }
      }

      renderDirectoryTree(tree, fileListItems);
      renderSkippedFiles(skippedFiles, skippedFileListItems);
      renderLargeFiles(largeFiles, skippedFileListItems);
      updateTextbox();

      if (largeFiles.length > 0) {
        alert(`Some files were too large to store in localStorage. They will be accessible but not saved for future sessions.`);
      }
    } catch (error) {
      console.error('Error processing directory:', error);
      alert('An error occurred while processing the directory. Please check the console for more details.');
    }
  });

  function addToTree(tree, file) {
    try {
      const parts = file.webkitRelativePath.split('/');
      let currentLevel = tree;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i === parts.length - 1) {
          // This is a file
          if (!currentLevel.files) currentLevel.files = [];
          currentLevel.files.push(file);
        } else {
          // This is a directory
          if (!currentLevel[part]) currentLevel[part] = {};
          currentLevel = currentLevel[part];
        }
      }

      // Handle files in the root directory
      if (parts.length === 1) {
        if (!tree.files) tree.files = [];
        tree.files.push(file);
      }
    } catch (error) {
      console.error('Error adding file to tree:', error);
      throw error;
    }
  }

  function renderSkippedFiles(skippedFiles, parentElement) {
    try {
      for (const file of skippedFiles) {
        const listItem = document.createElement('li');
        listItem.textContent = file.webkitRelativePath || file.name;
        parentElement.appendChild(listItem);
      }
    } catch (error) {
      console.error('Error rendering skipped files:', error);
      throw error;
    }
  }

  function renderLargeFiles(largeFiles, parentElement) {
    try {
      for (const file of largeFiles) {
        const listItem = document.createElement('li');
        listItem.textContent = `${file.webkitRelativePath || file.name} (too large for localStorage)`;
        parentElement.appendChild(listItem);
      }
    } catch (error) {
      console.error('Error rendering large files:', error);
      throw error;
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        resolve(reader.result);
      };

      reader.onerror = () => {
        reject(reader.error);
      };

      reader.readAsText(file);
    });
  }

  function createFileListItem(file, fullPath) {
    try {
      const listItem = document.createElement('li');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `file-${fullPath}`;
      checkbox.checked = true;
      checkbox.classList.add('mr-2');

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.textContent = file.webkitRelativePath || file.name;

      listItem.appendChild(checkbox);
      listItem.appendChild(label);

      checkbox.addEventListener('change', function() {
        updateTextbox();
      });

      return listItem;
    } catch (error) {
      console.error('Error creating file list item:', error);
      throw error;
    }
  }

  function renderDirectoryTree(tree, parentElement, path = '') {
    try {
      const dirs = Object.keys(tree).filter(key => key !== 'files').sort();
      const files = tree.files || [];

      for (const dir of dirs) {
        const dirItem = document.createElement('li');
        const dirCheckbox = document.createElement('input');
        dirCheckbox.type = 'checkbox';
        dirCheckbox.id = `dir-${path}${dir}`;
        dirCheckbox.checked = true;
        dirCheckbox.classList.add('mr-2');

        const dirLabel = document.createElement('label');
        dirLabel.htmlFor = dirCheckbox.id;
        dirLabel.textContent = dir;
        dirLabel.classList.add('font-bold');

        dirItem.appendChild(dirCheckbox);
        dirItem.appendChild(dirLabel);

        const dirContents = renderDirectoryTree(tree[dir], document.createElement('ul'), `${path}${dir}/`);
        if (dirContents.childElementCount > 0) {
          dirContents.classList.add('ml-4');
          dirItem.appendChild(dirContents);
        }

        dirCheckbox.addEventListener('change', function() {
          const dirCheckboxes = dirContents.querySelectorAll('input[type="checkbox"]');
          for (const checkbox of dirCheckboxes) {
            checkbox.checked = dirCheckbox.checked;
          }
          updateTextbox();
        });

        parentElement.appendChild(dirItem);
      }

      for (const file of files.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name))) {
        const fullPath = file.webkitRelativePath || file.name;
        const listItem = createFileListItem(file, fullPath);
        parentElement.appendChild(listItem);
      }

      return parentElement;
    } catch (error) {
      console.error('Error rendering directory tree:', error);
      throw error;
    }
  }

  function getAcceptedTypes() {
    const checkboxes = document.querySelectorAll('#settingsModal input[type="checkbox"]');
    let acceptedTypes = [];
    checkboxes.forEach(function(checkbox) {
      if (checkbox.checked) {
        acceptedTypes.push('.' + checkbox.id.replace('Checkbox', '').toLowerCase());
      }
    });
    return acceptedTypes;
  }

  document.getElementById('settingsButton').addEventListener('click', function() {
    document.getElementById('settingsModal').classList.remove('hidden');
  });

  document.getElementById('cancelSettingsButton').addEventListener('click', function() {
    document.getElementById('settingsModal').classList.add('hidden');
  });

  document.getElementById('saveSettingsButton').addEventListener('click', function() {
    const acceptedTypes = getAcceptedTypes();
    const acceptString = acceptedTypes.join(',');
    document.getElementById('fileInput').accept = acceptString;
    document.getElementById('dirInput').accept = acceptString;
    document.getElementById('settingsModal').classList.add('hidden');
    updateTextbox();
  });

  window.addEventListener('load', function() {
    const acceptedTypes = getAcceptedTypes();
    const acceptString = acceptedTypes.join(',');
    document.getElementById('fileInput').accept = acceptString;
    document.getElementById('dirInput').accept = acceptString;
  });

  function updateTextbox() {
  try {
    const textbox = document.getElementById('textbox');
    textbox.value = '';
    const checkboxes = document.querySelectorAll('#fileListItems input[type="checkbox"]');
    const newLineCount = parseInt(document.getElementById('newLineCount').value);

    let isFirstFile = true;

    for (const checkbox of checkboxes) {
      if (checkbox.checked) {
        const fullPath = checkbox.id.replace('file-', '');
        const fileContent = localStorage.getItem(fullPath);
        if (fileContent) {
          if (!isFirstFile) {
            textbox.value += '\n'.repeat(newLineCount);
          }
          textbox.value += `File: ${fullPath}\n\n${fileContent}\n`;
          isFirstFile = false;
        } else {
          // If the file content is not in localStorage, read it again
          const file = Array.from(document.getElementById('dirInput').files).find(f => f.webkitRelativePath === fullPath);
          if (file) {
            readFileAsText(file).then(content => {
              if (!isFirstFile) {
                textbox.value += '\n'.repeat(newLineCount);
              }
              textbox.value += `File: ${fullPath}\n\n${content}\n`;
              isFirstFile = false;
            }).catch(error => {
              console.error(`Error re-reading file ${fullPath}: ${error}`);
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating textbox:', error);
    alert('An error occurred while updating the textbox. Please check the console for more details.');
  }
}