import java.nio.file.*;
import java.sql.*;
import java.util.Properties;

// Reads credentials locally without printing them. Run from the backend directory.
class CheckFestivalEstimates {
    public static void main(String[] args) throws Exception {
        Properties config = new Properties();
        try (var reader = Files.newBufferedReader(Path.of(".env"))) { config.load(reader); }
        String url = config.getProperty("SPRING_DATASOURCE_URL");
        Properties credentials = new Properties();
        credentials.setProperty("user", config.getProperty("SPRING_DATASOURCE_USERNAME"));
        credentials.setProperty("password", config.getProperty("SPRING_DATASOURCE_PASSWORD"));
        credentials.setProperty("connectTimeout", "15");
        credentials.setProperty("socketTimeout", "30");
        try (Connection connection = DriverManager.getConnection(url, credentials)) {
            connection.setAutoCommit(false);
            try (Statement statement = connection.createStatement()) {
                try (ResultSet result = statement.executeQuery("SELECT to_regclass('public.festival_expense_estimates') IS NOT NULL")) {
                    result.next();
                    boolean exists = result.getBoolean(1);
                    System.out.println("Festival estimate table exists: " + exists);
                    if (exists) {
                        try (Statement check = connection.createStatement()) {
                            check.executeQuery("SELECT id, festival_event_id, description, category_name, vendor_name, quantity, unit_cost, remarks FROM festival_expense_estimates LIMIT 0").close();
                        }
                        System.out.println("Estimate query: OK");
                        connection.rollback();
                        return;
                    }
                }
                if (args.length == 0 || !args[0].equals("--apply")) { connection.rollback(); return; }
                statement.execute("SET LOCAL lock_timeout = '5s'");
                statement.execute(Files.readString(Path.of("src/main/resources/db/migration/V33__Festival_Expense_Estimates.sql")));
                statement.executeQuery("SELECT id, festival_event_id, description, category_name, vendor_name, quantity, unit_cost, remarks FROM festival_expense_estimates LIMIT 0").close();
                connection.commit();
                System.out.println("V33 schema applied. Estimate query: OK");
            } catch (Exception error) { connection.rollback(); throw error; }
        }
    }
}
