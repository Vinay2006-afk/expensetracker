<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

$host = "localhost";
$user = "root";       // default MAMP MySQL user
$pass = "root";       // default MAMP MySQL password
$db   = "spendsense"; // your database

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["success"=>false,"error"=>$conn->connect_error]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

switch ($action) {
    case "list":
        $res = $conn->query("SELECT * FROM expenses ORDER BY date DESC");
        echo json_encode(["success"=>true,"data"=>$res->fetch_all(MYSQLI_ASSOC)]);
        break;

    case "add":
        $data = json_decode(file_get_contents("php://input"), true);
        if(!$data) $data = $_POST; // fallback for form-encoded
        $stmt = $conn->prepare("INSERT INTO expenses (amount, category, note, date) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("dsss", $data['amount'], $data['category'], $data['note'], $data['date']);
        $stmt->execute();
        echo json_encode(["success"=>true,"id"=>$stmt->insert_id]);
        break;

    case "update":
        $id = intval($_GET['id'] ?? 0);
        $data = json_decode(file_get_contents("php://input"), true);
        $stmt = $conn->prepare("UPDATE expenses SET amount=?, category=?, note=?, date=? WHERE id=?");
        $stmt->bind_param("dsssi", $data['amount'], $data['category'], $data['note'], $data['date'], $id);
        $stmt->execute();
        echo json_encode(["success"=>true,"updated"=>$stmt->affected_rows]);
        break;

    case "delete":
        $id = intval($_GET['id'] ?? 0);
        $stmt = $conn->prepare("DELETE FROM expenses WHERE id=?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        echo json_encode(["success"=>true,"deleted"=>$stmt->affected_rows]);
        break;

    default:
        echo json_encode(["success"=>false,"error"=>"Invalid action"]);
}
$conn->close();
