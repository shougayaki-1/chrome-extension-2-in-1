export function createConversionControlState({ urlButton, fileButton, urlAvailable = false }) {
  let busy = false;
  let canConvertUrl = urlAvailable;

  function apply() {
    urlButton.disabled = busy || !canConvertUrl;
    fileButton.disabled = busy;
  }

  apply();

  return {
    setUrlAvailable(value) {
      canConvertUrl = value;
      apply();
    },
    start() {
      if (busy) return false;
      busy = true;
      apply();
      return true;
    },
    finish() {
      busy = false;
      apply();
    }
  };
}
