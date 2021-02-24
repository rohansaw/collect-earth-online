(ns org.openforis.ceo.cucumber.remote
  (:import [org.openqa.selenium.remote RemoteWebDriver DesiredCapabilities]
           [java.net URL]))


(defn- capabilities [{:keys [os os-version browser browser-version test-name]}]
  (let [caps (DesiredCapabilities.)]
    (.setCapability caps "os" os)
    (.setCapability caps "os-version" os-version)
    (.setCapability caps "browser" browser)
    (.setCapability caps "browser-version" browser-version)
    (.setCapability caps "test-name" test-name)
    caps))

(def ^:private browserstack-url "http://%s:%s@hub-cloud.browserstack.com/wd/hub")
(defn- connection [{:keys [username api-key]}]
  (let [url (format browserstack-url username api-key)]
    (URL. url)))

(defn remote-driver [opts]
  (let [conn (connection opts)
        caps (capabilities opts)]
    (RemoteWebDriver. conn caps)))
