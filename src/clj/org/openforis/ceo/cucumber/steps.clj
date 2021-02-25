(ns org.openforis.ceo.cucumber.steps
  (:require [org.openforis.ceo.cucumber.by :as by]
            [org.openforis.ceo.cucumber.element :as e]
            [org.openforis.ceo.cucumber.utils :as u]
            [org.openforis.ceo.cucumber.webdriver :as w]
            [clojure.test :refer [is]]))

(def all-steps (atom []))

;; Private

(defn- step-maker [phrase f]
  (swap! all-steps conj {:match (re-pattern phrase) :fun f}))

(defn- Given [phrase f]
  (step-maker phrase f))

(defn- When [phrase f]
  (step-maker phrase f))

(defn- Then [phrase f]
  (step-maker phrase f))

(defn- And [phrase f]
  (step-maker phrase f))

(defn- unknown-def [step-name]
  (fn [_] (println "Could not find definition for: '" step-name "'")))

;; Public
(defn find-step [step-name]
  (let [step-defs (filter #(re-find (:match %) step-name) @all-steps)
        fun (-> (or (first step-defs) {}) (get :fun (unknown-def step-name)))]
    {:step-name step-name :fun fun}))

(defn run-step [step-name ctx]
  (let [{:keys [fun]} (find-step step-name)]
    (fun ctx)))

;; Steps
(Given "I go to collect.earth"
      (fn [{:keys [driver]}]
        (w/goto driver "https://collect.earth")))

(Given "I am a visitor"
      (fn [{:keys [driver] :as ctx}]
        (w/maximize driver)
        (run-step "I go to collect.earth" ctx)
        (let [wait (w/wait driver 10)]
          (.until wait (w/presence-of (by/css "input"))))))

(When "I go to the login screen"
      (fn [{:keys [driver]}]
        (let [button (e/find-el driver (by/css "button[type='button'].btn.btn-lightgreen.btn-sm"))] ;; seconds
          (e/click! button)
          (println (w/title driver)))))

(And "I login"
     (fn [{:keys [driver]}]
       (let [wait (w/wait driver 10)]
         (.until wait (w/presence-of (by/css "input"))
                 (let [email-input (e/find-el driver (by/id "email"))
                       password-input (e/find-el driver (by/id "password"))
                       submit-btn (e/find-el driver (by/css "button[type='submit']"))]
                   (e/click! email-input)
                   (e/send-keys! email-input "rsheperd@sig-gis.com")
                   (e/click! password-input)
                   (e/send-keys! password-input "lMXQYd8g8UyMfPF")
                   (e/click! submit-btn))))))

(When "I search for an institution"
      (fn [{:keys [driver]}]
        (let [input (e/find-el driver (by/id "input"))] ;; seconds
          (e/click! input)
          (e/send-keys! input "FAO"))))

(Then "I can see my institutions"
      (fn [{:keys [driver]}]
        (let [_ (w/wait driver 2)]
          (u/sleep 2000)
          (let [tree (e/find-el driver (by/css "ul.tree"))
                institutions (e/find-els tree (by/css "li"))]
            (is (= 1 (count institutions)))))))

(Given "I am a User"
       (fn [{:keys [driver] :as ctx}]
         (run-step "I go to collect.earth" ctx)
         (run-step "I go to the login screen" ctx)
         (run-step "I login" ctx)))

(Then "I can see matching institutions"
      (fn [{:keys [driver]}]
        (let [_ (w/wait driver 2)]
          (u/sleep 2000)
          (let [tree (e/find-el driver (by/css "ul.tree"))
                institutions (e/find-els tree (by/css "li"))]
            (is (= 12 (count institutions)))))))
