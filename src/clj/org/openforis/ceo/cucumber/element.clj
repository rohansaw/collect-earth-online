(ns org.openforis.ceo.cucumber.element
  (:import [org.openqa.selenium By WebElement]))

(defn attr-value [^WebElement e k]
  (.getAttribute e k))

(defn clear! [^WebElement e]
  (.click e))

(defn click! [^WebElement e]
  (.click e))

(defn css-value [^WebElement e k]
  (.getAttribute e k))

(defn displayed? [^WebElement e]
  (.isDisplayed e))

(defn dom-attr [^WebElement e k]
  (.domAttribute e k))

(defn dom-property [^WebElement e k]
  (.domProperty e k))

(defn find-el [e ^By by]
  (.findElement e by))

(defn find-els [e ^By by]
  (.findElements e by))

(defn enabled? [^WebElement e]
  (.isEnabled e))

(defn location [^WebElement e]
  (.getLocation e))

(defn rect [^WebElement e]
  (.getRect e))

(defn selected? [^WebElement e]
  (.isSelected e))

(defn send-keys! [^WebElement e s]
  (.sendKeys e (into-array [s])))

(defn size [^WebElement e]
  (.getSize e))

(defn submit! [^WebElement e]
  (.submit e))

(defn tag-name [^WebElement e]
  (.tagName e))

(defn text [^WebElement e]
  (.text e))

